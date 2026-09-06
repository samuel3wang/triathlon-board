import { Fragment, useState, useMemo } from "react";
import type { SortDir, SortField, ViewAthlete, ViewBoard } from "../types";
import "./Leaderboard.css";
import "./KonaBoard.css";

const COL_COUNT = 8;

/** `normalizeBoard` already parsed every sortable column to seconds, so this is a number compare. */
const sortAthletes = (
  list: ViewAthlete[],
  sortField: SortField,
  sortDir: SortDir,
): ViewAthlete[] =>
  [...list].sort((a, b) => {
    const va = a.secs[sortField];
    const vb = b.secs[sortField];
    if (va < vb) return sortDir === "asc" ? -1 : 1;
    if (va > vb) return sortDir === "asc" ? 1 : -1;
    return 0;
  });

interface YearGroup {
  year: string;
  rows: ViewAthlete[];
}

interface KonaBoardProps {
  data: ViewBoard;
}

/**
 * KONA is a finisher list, not a race: no overall rank, and the year takes the
 * place of 賽會名稱. The two 歷屆最速 rows sit on top, then one section per
 * year, newest first, ordered by total time regardless of gender.
 */
function KonaBoard({ data }: KonaBoardProps) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState<SortField | null>(null);
  const [sortDir, setSortDir] = useState<SortDir>("asc");

  const matches = (a: ViewAthlete, q: string) =>
    (a.name || "").toLowerCase().includes(q) ||
    (a.year || "").includes(q) ||
    (a.note || "").toLowerCase().includes(q);

  const { years, records, totalCount } = useMemo(() => {
    const q = search.trim().toLowerCase();
    const list = q
      ? data.athletes.filter((a) => matches(a, q))
      : data.athletes;

    // `normalizeBoard`已按年度（新到舊）＋總成績排好，所以這裡只要切段。
    const groups: YearGroup[] = [];
    for (const a of list) {
      const year = a.year || "未標註年度";
      const last = groups[groups.length - 1];
      if (last && last.year === year) last.rows.push(a);
      else groups.push({ year, rows: [a] });
    }
    if (sortField) {
      for (const g of groups) g.rows = sortAthletes(g.rows, sortField, sortDir);
    }

    const fastest = data.fastest ?? {};
    const pinned: ViewAthlete[] = [];
    if (fastest.female) pinned.push(fastest.female);
    if (fastest.male) pinned.push(fastest.male);

    return {
      years: groups,
      records: q ? pinned.filter((a) => matches(a, q)) : pinned,
      totalCount: list.length,
    };
  }, [data.athletes, data.fastest, search, sortField, sortDir]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === "asc") setSortDir("desc");
      else {
        setSortField(null);
        setSortDir("asc");
      }
    } else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const sortIcon = (field: SortField): string => {
    if (sortField !== field) return " ↕";
    return sortDir === "asc" ? " ↑" : " ↓";
  };

  /**
   * 年度只印在「歷屆最速」那兩列 —— 年度區塊本身已經有一列年份標題，
   * 每一列再重複一次沒有意義。
   */
  const row = (a: ViewAthlete, note: string, showYear = false) => (
    <>
      <td className="col-year">{showYear ? a.year || "—" : ""}</td>
      <td className="col-name">{a.name}</td>
      <td className="col-total">{a.totalTime || "—"}</td>
      <td className="col-split col-swim">{a.swimTime || "—"}</td>
      <td className="col-split col-bike">{a.bikeTime || "—"}</td>
      <td className="col-split col-run">{a.runTime || "—"}</td>
      <td className="col-split col-transition">{a.transitionTime || "—"}</td>
      <td className="col-note">{note || "—"}</td>
    </>
  );

  return (
    <div className="leaderboard kona-board">
      <div className="board-header">
        <div>
          <h2 className="board-title">{data.title}</h2>
          <p className="board-subtitle">{data.subtitle}</p>
        </div>
        <div className="board-meta">
          <span className="last-updated">最後更新：{data.lastUpdated}</span>
          <span className="sort-note">資料依成績排序</span>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜尋選手、年度..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="search-input"
        />
        {search && <span className="result-count">找到 {totalCount} 筆結果</span>}
      </div>

      <div className="table-container">
        <table className="ranking-table">
          <thead>
            <tr>
              <th className="col-year">年度</th>
              <th className="col-name">選手姓名</th>
              <th
                className="col-total sortable"
                onClick={() => handleSort("totalTime")}
              >
                總成績{sortIcon("totalTime")}
              </th>
              <th
                className="col-split col-swim sortable"
                onClick={() => handleSort("swimTime")}
              >
                游泳{sortIcon("swimTime")}
              </th>
              <th
                className="col-split col-bike sortable"
                onClick={() => handleSort("bikeTime")}
              >
                自行車{sortIcon("bikeTime")}
              </th>
              <th
                className="col-split col-run sortable"
                onClick={() => handleSort("runTime")}
              >
                跑步{sortIcon("runTime")}
              </th>
              <th className="col-split col-transition">T1+T2</th>
              <th className="col-note">備註</th>
            </tr>
          </thead>
          <tbody>
            {records.length > 0 && (
              <>
                <tr className="group-header record-header">
                  <td colSpan={COL_COUNT}>歷屆最速</td>
                </tr>
                {records.map((a) => (
                  <tr key={`${a.gender}-${a.year}-${a.name}`} className="record-row">
                    {row(a, a.note || "", true)}
                  </tr>
                ))}
              </>
            )}
            {years.map((group) => (
              <Fragment key={group.year}>
                <tr className="group-header">
                  <td colSpan={COL_COUNT}>{group.year}</td>
                </tr>
                {group.rows.map((a, i) => (
                  <tr key={`${group.year}-${i}`}>{row(a, a.note || "")}</tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {data.notes && data.notes.some((n) => n.trim()) && (
        <div className="notes">
          <h3>備註</h3>
          <ul>
            {data.notes.filter((n) => n.trim()).map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default KonaBoard;
