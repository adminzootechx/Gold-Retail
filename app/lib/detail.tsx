"use client";
import { createContext, useContext } from "react";

/** A record that can open in the side panel. */
export type Detail = { kind: "piece" | "invoice" | "jobcard"; id: string };
interface Ctx { open: (d: Detail) => void }

export const DetailCtx = createContext<Ctx>({ open: () => {} });
export const useDetail = () => useContext(DetailCtx);
