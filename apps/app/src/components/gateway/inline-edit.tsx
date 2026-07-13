import { useState, type ReactNode } from 'react'
import { Check, X, Pencil, Loader2 } from 'lucide-react'

/**
 * Tiny inline-edit wrapper: renders `display` normally; clicking the pencil
 * swaps in `editor` plus Save / Cancel controls. Caller owns validation and
 * the actual save call — `onSave` is async and may throw.
 */
export interface InlineEditProps {
  display: ReactNode
  editor: ReactNode
  onSave: () => Promise<void>
  canSave?: boolean
  saving?: boolean
  /** When false the editor is locked (caller-driven external validation). */
  disabled?: boolean
}

export function InlineEdit({
  display,
  editor,
  onSave,
  canSave = true,
  saving = false,
  disabled = false,
}: InlineEditProps) {
  const [editing, setEditing] = useState(false)

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">{display}</div>
        {!disabled && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-muted-foreground hover:text-foreground p-1"
            aria-label="Edit"
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    )
  }

  const cancel = () => setEditing(false)
  const save = async () => {
    try {
      await onSave()
      setEditing(false)
    } catch {
      // caller surfaces toast; we stay in editor so they can retry or cancel
    }
  }

  return (
    <div className="space-y-2">
      {editor}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={save}
          disabled={!canSave || saving}
          className="inline-flex items-center gap-1 border border-status-active-500 text-status-active-700 px-2 py-1 text-xs hover:bg-status-active-50 disabled:opacity-40"
        >
          {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
          Save
        </button>
        <button
          type="button"
          onClick={cancel}
          disabled={saving}
          className="inline-flex items-center gap-1 border border-border text-muted-foreground px-2 py-1 text-xs hover:bg-accent disabled:opacity-40"
        >
          <X className="w-3 h-3" />
          Cancel
        </button>
      </div>
    </div>
  )
}
