import * as React from "react";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { TagRegistryInput } from "./TagRegistryInput";
import { useToast } from "@/components/ui/toast";

export type AddScope = "file" | "folder" | "all";

export function AddFieldSection({
  variant,
  onAdd,
}: {
  variant: "single" | "multi";
  onAdd: (scope: AddScope, fieldType: string, value: string) => void | Promise<unknown>;
}) {
  const [fieldType, setFieldType] = React.useState("");
  const [value, setValue] = React.useState("");
  const [busy, setBusy] = React.useState(false);
  const { toast } = useToast();

  const submit = async (scope: AddScope) => {
    if (!fieldType.trim()) {
      toast("Field type is required", "error");
      return;
    }
    setBusy(true);
    try {
      await onAdd(scope, fieldType.trim(), value.trim());
      setFieldType("");
      setValue("");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div
      id="add-field-section"
      className="mt-4 rounded-lg border border-border bg-muted/30 p-3"
    >
      <div className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        <Plus className="size-3.5" />
        Add new field
      </div>

      <div className="flex flex-col gap-2">
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Field type</label>
          <TagRegistryInput
            value={fieldType}
            onChange={setFieldType}
            placeholder="e.g. Genre"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs text-muted-foreground">Value</label>
          <Input
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="e.g. hardcore (optional)"
          />
        </div>

        <div className="mt-1 flex flex-wrap gap-2">
          {variant === "single" ? (
            <>
              <Button size="sm" disabled={busy} onClick={() => submit("file")}>
                Add to file
              </Button>
              <Button
                size="sm"
                variant="success"
                disabled={busy}
                onClick={() => submit("folder")}
              >
                Add to folder
              </Button>
            </>
          ) : (
            <Button size="sm" disabled={busy} onClick={() => submit("all")}>
              Add to all selected
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
