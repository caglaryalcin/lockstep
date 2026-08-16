import { createContextId, type Signal, useContext } from "@builder.io/qwik";

export const DemoModeContext =
  createContextId<Signal<boolean>>("lockstep.demo-mode");

export const useDemoModeContext = () => useContext(DemoModeContext);
