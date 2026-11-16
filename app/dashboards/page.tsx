"use client";
import { Suspense } from "react";
import { PageHeader } from "../components/ui";
import Analytics from "./Analytics";

export default function Dashboards() {
  return (
    <>
      <PageHeader title="Dashboards & Analytics" sub="Twelve dashboards from the same live data." />
      <Suspense fallback={null}><Analytics /></Suspense>
    </>
  );
}
