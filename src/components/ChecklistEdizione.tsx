"use client";

import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Tooltip from "@mui/material/Tooltip";
import CheckCircleOutlined from "@mui/icons-material/CheckCircleOutlined";
import ErrorOutlined from "@mui/icons-material/ErrorOutlined";
import RadioButtonUnchecked from "@mui/icons-material/RadioButtonUnchecked";
import type { PassoChecklist } from "@/lib/checklist";

export default function ChecklistEdizione({
  passi,
  onVai,
}: {
  passi: PassoChecklist[];
  onVai: (scheda: string) => void;
}) {
  return (
    <Stack direction="row" spacing={1} sx={{ flexWrap: "wrap", gap: 1, mb: 2 }}>
      {passi.map((p) => (
        <Tooltip key={p.id} title={p.dettaglio ?? p.etichetta}>
          <Chip
            size="small"
            icon={
              p.stato === "ok" ? (
                <CheckCircleOutlined />
              ) : p.stato === "warn" ? (
                <ErrorOutlined />
              ) : (
                <RadioButtonUnchecked />
              )
            }
            label={p.etichetta}
            color={p.stato === "ok" ? "success" : p.stato === "warn" ? "warning" : "default"}
            variant={p.stato === "todo" ? "outlined" : "filled"}
            onClick={() => onVai(p.scheda)}
            sx={{ cursor: "pointer" }}
          />
        </Tooltip>
      ))}
    </Stack>
  );
}
