import { NextResponse } from "next/server";
import { z } from "zod";

import { canMemberUseAi } from "@/features/family/lib/ai-access";
import {
  executeAction,
  runUndo,
  type ExecutedAction,
  type UndoSpec,
  type WriteActionType,
} from "@/lib/ai/actions";
import { getErrorMessage } from "@/lib/get-error-message";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const ACTION_TYPES = [
  "add_shopping_item",
  "remove_shopping_item",
  "update_inventory",
  "plan_meal",
  "create_recipe",
  "add_chore",
  "add_event",
  "add_idea",
] as const;

const actionSchema = z.object({
  id: z.string().max(64).optional(),
  type: z.enum(ACTION_TYPES),
  label: z.string().max(300).optional(),
  params: z.record(z.string(), z.unknown()),
});

const requestSchema = z.union([
  z.object({ actions: z.array(actionSchema).min(1).max(30) }),
  z.object({ undo: z.array(z.unknown()).min(1).max(30) }),
]);

/**
 * Exécute (ou annule) des actions IA que l'utilisateur a confirmées.
 * La validation métier vit dans `executeAction` : on ne fait jamais confiance
 * aveuglément aux paramètres, même après confirmation (section 18).
 */
export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Authentification requise." }, { status: 401 });
    }

    const { data: families } = await supabase
      .from("families")
      .select("id,ai_min_age")
      .order("created_at", { ascending: true })
      .limit(1);
    const family = families?.[0];
    if (!family) {
      return NextResponse.json({ error: "Aucune famille active." }, { status: 400 });
    }

    const { data: membership } = await supabase
      .from("family_members")
      .select("role,can_use_ai,birth_date")
      .eq("family_id", family.id)
      .eq("user_id", user.id)
      .single();
    const allowed = membership
      ? canMemberUseAi({
          role: membership.role,
          canUseAi: membership.can_use_ai,
          birthDate: membership.birth_date,
          minAge: family.ai_min_age,
        })
      : true;
    if (!allowed) {
      return NextResponse.json(
        { error: "L'accès à l'assistant a été désactivé par un parent." },
        { status: 403 },
      );
    }

    const parsed = requestSchema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) {
      return NextResponse.json({ error: "Requête invalide." }, { status: 400 });
    }

    // Annulation d'actions précédemment exécutées.
    if ("undo" in parsed.data) {
      for (const spec of parsed.data.undo as UndoSpec[]) {
        await runUndo(supabase, family.id, spec);
      }
      return NextResponse.json({ ok: true });
    }

    // Exécution des actions confirmées.
    const results: ExecutedAction[] = [];
    for (const action of parsed.data.actions) {
      const id = action.id ?? action.type;
      const label = action.label ?? action.type;
      try {
        const outcome = await executeAction(
          supabase,
          family.id,
          user.id,
          action.type as WriteActionType,
          action.params,
        );
        results.push(
          outcome.ok
            ? { id, label, ok: true, summary: outcome.summary, undo: outcome.undo }
            : { id, label, ok: false, summary: outcome.error, undo: null },
        );
      } catch (error) {
        results.push({ id, label, ok: false, summary: getErrorMessage(error), undo: null });
      }
    }

    return NextResponse.json({ results });
  } catch (error) {
    console.error("[assistant/execute] erreur:", error);
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}
