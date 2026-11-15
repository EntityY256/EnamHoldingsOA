import { analyse } from "../../src/lib/engine/fundamentals";
import { isLenderCo, snapshotCompany } from "../../src/lib/companies";
for (const s of ["TCS", "DIXON", "DEEPAKNTR", "CREDITACC", "HDFCBANK"]) {
  const co = snapshotCompany(s)!;
  const f = analyse(co, isLenderCo(co));
  console.log(s, "|", [...f.trajectory.signals, ...f.balanceSheet.signals, ...f.cash.signals].map((x) => x.text).join(" || "));
}
