import { Fragment, useState, useMemo } from 'react'
import type { SortDir, SortField, ViewAthlete, ViewBoard } from '../types'
import './Leaderboard.css'

const COL_COUNT = 8

/**
 * Every column but 名字 is a time, and `normalizeBoard` already parsed those to
 * seconds — so a compare here is a number compare, never a string parse.
 */
const sortAthletes = (
  list: ViewAthlete[],
  sortField: SortField | null,
  sortDir: SortDir
): ViewAthlete[] => {
  const field: SortField = sortField ?? 'totalTime'
  const dir: SortDir = sortField ? sortDir : 'asc'
  return [...list].sort((a, b) => {
    let va: string | number
    let vb: string | number
    if (field === 'name') {
      va = (a.name ?? '').toLowerCase()
      vb = (b.name ?? '').toLowerCase()
    } else {
      va = a.secs[field]
      vb = b.secs[field]
    }
    if (va < vb) return dir === 'asc' ? -1 : 1
    if (va > vb) return dir === 'asc' ? 1 : -1
    return 0
  })
}

interface Group {
  label: string | null
  rows: ViewAthlete[]
}

interface LeaderboardProps {
  data: ViewBoard
}

function Leaderboard({ data }: LeaderboardProps) {
  const [search, setSearch] = useState('')
  const [sortField, setSortField] = useState<SortField | null>(null)
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  const isKona = data.category === 'kona'

  const { groups, totalCount } = useMemo<{ groups: Group[]; totalCount: number }>(() => {
    let list = data.athletes || []
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(
        a =>
          (a.name || '').toLowerCase().includes(q) ||
          (a.raceName || '').toLowerCase().includes(q)
      )
    }

    if (isKona) {
      const women = list.filter(a => a.gender === 'female')
      const men = list.filter(a => a.gender === 'male')
      const sortedWomen = sortAthletes(women, sortField, sortDir)
      const sortedMen = sortAthletes(men, sortField, sortDir)
      return {
        groups: [
          { label: '女子', rows: sortedWomen },
          { label: '男子', rows: sortedMen },
        ],
        totalCount: sortedWomen.length + sortedMen.length,
      }
    }

    const sorted = sortField
      ? sortAthletes(list, sortField, sortDir)
      : list
    return { groups: [{ label: null, rows: sorted }], totalCount: sorted.length }
  }, [data.athletes, search, sortField, sortDir, isKona])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      if (sortDir === 'asc') setSortDir('desc')
      else {
        setSortField(null)
        setSortDir('asc')
      }
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortIcon = (field: SortField): string => {
    if (sortField !== field) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  return (
    <div className="leaderboard">
      <div className="board-header">
        <div>
          <h2 className="board-title">{data.title}</h2>
          <p className="board-subtitle">{data.subtitle}</p>
        </div>
        <div className="board-meta">
          <span className="last-updated">最後更新：{data.lastUpdated}</span>
        </div>
      </div>

      <div className="search-bar">
        <input
          type="text"
          placeholder="搜尋選手、賽事..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="search-input"
        />
        {search && (
          <span className="result-count">
            找到 {totalCount} 筆結果
          </span>
        )}
      </div>

      <div className="table-container">
        <table className="ranking-table">
          <thead>
            <tr>
              <th className="col-rank">排名</th>
              <th className="col-name sortable" onClick={() => handleSort('name')}>
                選手姓名{sortIcon('name')}
              </th>
              <th className="col-total sortable" onClick={() => handleSort('totalTime')}>
                總成績{sortIcon('totalTime')}
              </th>
              <th className="col-split col-swim sortable" onClick={() => handleSort('swimTime')}>
                游泳{sortIcon('swimTime')}
              </th>
              <th className="col-split col-bike sortable" onClick={() => handleSort('bikeTime')}>
                自行車{sortIcon('bikeTime')}
              </th>
              <th className="col-split col-run sortable" onClick={() => handleSort('runTime')}>
                跑步{sortIcon('runTime')}
              </th>
              <th
                className="col-split col-transition sortable"
                onClick={() => handleSort('transitionTime')}
              >
                T1+T2{sortIcon('transitionTime')}
              </th>
              <th className="col-race">賽會名稱</th>

            </tr>
          </thead>
          <tbody>
            {groups.map((group, gi) => (
              <Fragment key={gi}>
                {group.label && group.rows.length > 0 && (
                  <tr className="group-header">
                    <td colSpan={COL_COUNT}>{group.label}</td>
                  </tr>
                )}
                {group.rows.map((a, i) => {
                  const displayRank = isKona ? i + 1 : a.rank
                  const isTop = displayRank !== undefined && displayRank <= 3
                  return (
                    <tr key={`${gi}-${i}`} className={isTop ? `top-${displayRank}` : ''}>
                      <td className="col-rank">
                        <span className={`rank-badge ${isTop ? `rank-${displayRank}` : ''}`}>
                          {displayRank}
                        </span>
                      </td>
                      <td className="col-name">{a.name}</td>
                      <td className="col-total">{a.totalTime}</td>
                      <td className="col-split col-swim">{a.swimTime}</td>
                      <td className="col-split col-bike">{a.bikeTime}</td>
                      <td className="col-split col-run">{a.runTime}</td>
                      <td className="col-split col-transition">{a.transitionTime || '—'}</td>
                      <td className="col-race">{a.raceName}</td>
                    </tr>
                  )
                })}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {data.notes && data.notes.length > 0 && (
        <div className="notes">
          <h3>備註</h3>
          <ul>
            {data.notes.map((n, i) => (
              <li key={i}>{n}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export default Leaderboard
