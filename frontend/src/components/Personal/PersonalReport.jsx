import { useMemo } from "react";
import { useSelector } from "react-redux";
import "./Personal.scss";
import { getCurrencySymbol, formatMoney } from "../../utils/currency";
import { CATEGORY_EMOJI } from "../../utils/categoryInfer";
import {
  FaArrowUp,
  FaArrowDown,
  FaRegCalendarCheck,
  FaChartPie,
  FaWallet,
} from "react-icons/fa";

const monthKey = (d) => {
  const x = new Date(d);
  return `${x.getFullYear()}-${x.getMonth()}`;
};

// Personal spending insights for the current month — a few high-signal
// numbers, mobile-first: hero total + trend, two quick tiles, and a
// compact "where it went" breakdown.
const PersonalReport = () => {
  const { expenses } = useSelector((s) => s.personal);
  const { userInfo } = useSelector((s) => s.login);
  const symbol = getCurrencySymbol(userInfo?.currency);

  const now = new Date();
  const thisKey = `${now.getFullYear()}-${now.getMonth()}`;
  const lastD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastKey = `${lastD.getFullYear()}-${lastD.getMonth()}`;
  const monthName = now.toLocaleString(undefined, { month: "long" });

  const { thisTotal, lastTotal, cats, count } = useMemo(() => {
    let thisTotal = 0;
    let lastTotal = 0;
    let count = 0;
    const byCat = {};
    for (const e of expenses) {
      const k = monthKey(e.date);
      const amt = Number(e.amount || 0);
      if (k === thisKey) {
        thisTotal += amt;
        count += 1;
        const c = e.category || "Others";
        byCat[c] = (byCat[c] || 0) + amt;
      } else if (k === lastKey) {
        lastTotal += amt;
      }
    }
    const cats = Object.entries(byCat)
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);
    return { thisTotal, lastTotal, cats, count };
  }, [expenses, thisKey, lastKey]);

  const trend =
    lastTotal > 0 ? Math.round(((thisTotal - lastTotal) / lastTotal) * 100) : null;
  const avgPerDay = thisTotal / now.getDate();
  const top = cats[0];
  const maxCat = cats[0]?.value || 1;
  const topCats = cats.slice(0, 5);

  if (count === 0) {
    return (
      <div className="pReport pReport--empty">
        <div className="pReport__empty-icon">
          <FaWallet />
        </div>
        <h3>No spending yet this {monthName}</h3>
        <p>
          Log an expense in the Add Split tab (Personal) and your insights
          show up here.
        </p>
      </div>
    );
  }

  return (
    <div className="pReport">
      {/* Hero */}
      <div className="pReport__hero">
        <span className="pReport__hero-label">Spent this {monthName}</span>
        <div className="pReport__hero-amount">
          <span className="pReport__hero-cur">{symbol}</span>
          {formatMoney(thisTotal)}
        </div>
        {trend !== null ? (
          <span
            className={`pReport__trend ${
              trend > 0 ? "pReport__trend--up" : "pReport__trend--down"
            }`}
          >
            {trend > 0 ? <FaArrowUp /> : <FaArrowDown />}
            {Math.abs(trend)}% vs last month
          </span>
        ) : (
          <span className="pReport__trend pReport__trend--flat">
            {count} expense{count === 1 ? "" : "s"} so far
          </span>
        )}
      </div>

      {/* Quick tiles */}
      <div className="pReport__tiles">
        <div className="pReport__tile">
          <span className="pReport__tile-label">
            <FaChartPie /> Top category
          </span>
          {top ? (
            <strong>
              {CATEGORY_EMOJI[top.name] || "✨"} {top.name}
            </strong>
          ) : (
            <strong>—</strong>
          )}
          {top && (
            <small>
              {symbol}
              {formatMoney(top.value)}
            </small>
          )}
        </div>
        <div className="pReport__tile">
          <span className="pReport__tile-label">
            <FaRegCalendarCheck /> Avg / day
          </span>
          <strong>
            {symbol}
            {formatMoney(avgPerDay)}
          </strong>
          <small>over {now.getDate()} days</small>
        </div>
      </div>

      {/* Breakdown */}
      <div className="pReport__breakdown">
        <span className="pReport__section-label">Where it went</span>
        {topCats.map((c) => (
          <div className="pReport__bar-row" key={c.name}>
            <span className="pReport__bar-name">
              {CATEGORY_EMOJI[c.name] || "✨"} {c.name}
            </span>
            <span className="pReport__bar-track">
              <span
                className="pReport__bar-fill"
                style={{ width: `${Math.max(6, (c.value / maxCat) * 100)}%` }}
              />
            </span>
            <span className="pReport__bar-val">
              {symbol}
              {formatMoney(c.value)}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PersonalReport;
