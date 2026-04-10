"use client";

import { useState } from "react";
import CreateBootcampModal from "@/components/admin/CreateBootcampModal";

export default function BootcampsClient() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button className="btn-primary" onClick={() => setOpen(true)}>
        Create Bootcamp
      </button>
      <CreateBootcampModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
