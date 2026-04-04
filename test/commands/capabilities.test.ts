import { snapshotTest as cliffySnapshotTest } from "@cliffy/testing"
import { capabilitiesCommand } from "../../src/commands/capabilities.ts"

const denoArgs = ["--allow-all", "--quiet"]

await cliffySnapshotTest({
  name: "Capabilities Command - Help Text",
  meta: import.meta,
  colors: false,
  args: ["--help"],
  denoArgs,
  async fn() {
    await capabilitiesCommand.parse()
  },
})

await cliffySnapshotTest({
  name: "Capabilities Command - Human Summary",
  meta: import.meta,
  colors: false,
  args: ["--text"],
  denoArgs,
  async fn() {
    await capabilitiesCommand.parse()
  },
})

await cliffySnapshotTest({
  name: "Capabilities Command - JSON Output",
  meta: import.meta,
  colors: false,
  args: [],
  denoArgs,
  async fn() {
    await capabilitiesCommand.parse()
  },
})

await cliffySnapshotTest({
  name: "Capabilities Command - JSON Output v1 Compatibility",
  meta: import.meta,
  colors: false,
  args: ["--compat", "v1"],
  denoArgs,
  async fn() {
    await capabilitiesCommand.parse()
  },
})

await cliffySnapshotTest({
  name: "Capabilities Command - JSON Parse Failure",
  meta: import.meta,
  colors: false,
  args: ["--json", "--bogus"],
  denoArgs,
  canFail: true,
  async fn() {
    await capabilitiesCommand.parse()
  },
})

await cliffySnapshotTest({
  name: "Capabilities Command - Compat Rejects Text Mode",
  meta: import.meta,
  colors: false,
  args: ["--compat", "v2", "--text"],
  denoArgs,
  canFail: true,
  async fn() {
    await capabilitiesCommand.parse()
  },
})

await cliffySnapshotTest({
  name: "Capabilities Command - Invalid Compat Version",
  meta: import.meta,
  colors: false,
  args: ["--compat", "v3"],
  denoArgs,
  canFail: true,
  async fn() {
    await capabilitiesCommand.parse()
  },
})
