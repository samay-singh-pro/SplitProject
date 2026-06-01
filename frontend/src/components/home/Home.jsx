import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useSelector } from "react-redux";
import "./Home.scss";
import {
  FaUsers,
  FaBolt,
  FaShieldAlt,
  FaArrowRight,
  FaCheckCircle,
  FaArrowRight as FaArrow,
  FaUtensils,
  FaPlane,
  FaShoppingBag,
  FaChartPie,
  FaMagic,
} from "react-icons/fa";

// Reactively detect viewport — desktop renders the rich landing,
// phone/tablet renders the swipeable onboarding slider.
const useIsMobile = (query = "(max-width: 768px)") => {
  const [match, setMatch] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.matchMedia(query).matches;
  });

  useEffect(() => {
    const mql = window.matchMedia(query);
    const handler = (e) => setMatch(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, [query]);

  return match;
};

// Each feature card has a unique animated mini-visualization above the
// copy, so the page feels alive instead of three identical icon tiles.

// ----- Mobile onboarding slider -----
// Swipeable horizontal carousel with scroll-snap. IntersectionObserver
// keeps the dot indicator + bottom CTA in sync with the active slide.
const ONBOARD_SLIDES = [
  {
    kind: "welcome",
    title: "Welcome to splitit",
    body: "Track shared spends with no drama. Built for trips, roommates, and that one friend who always picks up the bill.",
  },
  {
    kind: "split",
    title: "Split with anyone",
    body: "Add a group, drop in names. No accounts required for the people you split with.",
  },
  {
    kind: "simplify",
    title: "Settle in fewest steps",
    body: "We compute who owes whom and simplify the chain to the minimum number of payments.",
  },
  {
    kind: "math",
    title: "Money math you can trust",
    body: "Cent-precise arithmetic. Every paisa is accounted for, even with uneven splits and percentages.",
  },
  {
    kind: "cta",
    title: "Ready when you are",
    body: "It takes 30 seconds to create a group and add your first expense.",
  },
];

const SlideVisual = ({ kind }) => {
  switch (kind) {
    case "welcome":
      return (
        <div className="onboard__viz onboard__viz--welcome">
          <div className="brandMark-orbit brandMark-orbit--dark">
            <span className="brandMark brandMark--xl">splitit</span>
          </div>
        </div>
      );
    case "split":
      return (
        <div className="landing__viz landing__viz--avatars onboard__viz onboard__viz--card">
          <span className="landing__viz-av landing__viz-av--1">SA</span>
          <span className="landing__viz-av landing__viz-av--2">AL</span>
          <span className="landing__viz-av landing__viz-av--3">JO</span>
          <span className="landing__viz-av landing__viz-av--4">RI</span>
          <span className="landing__viz-av landing__viz-av--plus">+</span>
        </div>
      );
    case "simplify":
      return (
        <div className="landing__viz landing__viz--simplify onboard__viz onboard__viz--card">
          <div className="landing__viz-stack landing__viz-stack--many">
            <span /><span /><span /><span /><span />
          </div>
          <FaArrowRight className="landing__viz-arrow" />
          <div className="landing__viz-stack landing__viz-stack--few">
            <span /><span /><span />
          </div>
        </div>
      );
    case "math":
      return (
        <div className="landing__viz landing__viz--math onboard__viz onboard__viz--card">
          <code className="landing__viz-line landing__viz-line--1">
            ₹1,000.00 ÷ 3
          </code>
          <code className="landing__viz-line landing__viz-line--2">
            = ₹333.34 + ₹333.33 + ₹333.33
          </code>
          <code className="landing__viz-line landing__viz-line--3">
            ✓ exactly ₹1,000.00
          </code>
        </div>
      );
    case "cta":
      return (
        <div className="onboard__viz onboard__viz--cta">
          <div className="onboard__viz-check">
            <FaCheckCircle />
          </div>
        </div>
      );
    default:
      return null;
  }
};

const MobileOnboard = () => {
  const trackRef = useRef(null);
  const slidesRef = useRef([]);
  const [active, setActive] = useState(0);

  // Track which slide is centered using IntersectionObserver.
  useEffect(() => {
    const root = trackRef.current;
    if (!root) return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = slidesRef.current.indexOf(entry.target);
            if (idx !== -1) setActive(idx);
          }
        });
      },
      { root, threshold: 0.6 }
    );
    slidesRef.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const goTo = (i) => {
    const el = slidesRef.current[i];
    if (!el) return;
    el.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
      inline: "start",
    });
  };

  const isLast = active === ONBOARD_SLIDES.length - 1;

  return (
    <main className="onboard">
      <header className="onboard__top">
        <span className="brandMark onboard__top-brand">splitit</span>
        {!isLast && (
          <button
            type="button"
            className="onboard__skip"
            onClick={() => goTo(ONBOARD_SLIDES.length - 1)}
          >
            Skip
          </button>
        )}
      </header>

      <div className="onboard__track" ref={trackRef}>
        {ONBOARD_SLIDES.map((s, i) => (
          <section
            key={s.kind}
            ref={(el) => (slidesRef.current[i] = el)}
            className="onboard__slide"
            aria-hidden={i !== active}
          >
            <SlideVisual kind={s.kind} />
            <h2 className="onboard__title">{s.title}</h2>
            <p className="onboard__body">{s.body}</p>
          </section>
        ))}
      </div>

      <footer className="onboard__bottom">
        <div className="onboard__dots" role="tablist">
          {ONBOARD_SLIDES.map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-label={`Go to slide ${i + 1}`}
              aria-selected={i === active}
              className={`onboard__dot ${
                i === active ? "onboard__dot--active" : ""
              }`}
              onClick={() => goTo(i)}
            />
          ))}
        </div>

        {isLast ? (
          <div className="onboard__cta-row">
            <Link to="/signup" className="onboard__cta onboard__cta--primary">
              Get started — free <FaArrowRight />
            </Link>
            <Link to="/login" className="onboard__cta onboard__cta--ghost">
              I already have an account
            </Link>
          </div>
        ) : (
          <button
            type="button"
            className="onboard__cta onboard__cta--primary"
            onClick={() => goTo(active + 1)}
          >
            Next <FaArrowRight />
          </button>
        )}
      </footer>
    </main>
  );
};

const Home = () => {
  const { isAuthenticated } = useSelector((state) => state.login);
  const isMobile = useIsMobile();

  // Mobile gets a native-app-style onboarding slider. Logged-in mobile
  // users still get redirected by the router before they see this.
  if (isMobile && !isAuthenticated) {
    return <MobileOnboard />;
  }

  return (
    <main className="landing">
      <div className="landing__bg" aria-hidden>
        <div className="landing__grid" />
        <div className="landing__glow" />
      </div>

      {/* Hero */}
      <section className="landing__hero">
        <div className="landing__hero-copy">
          <span className="landing__eyebrow">
            Shared expenses, without the drama
          </span>
          <h1 className="landing__title">
            Split bills <span className="landing__title-accent">fairly</span>,
            settle them <span className="landing__title-accent">faster</span>.
          </h1>
          <p className="landing__lede">
            Track group spend, see who owes what at a glance, and pay each
            other back in the fewest possible transfers. Built for trips,
            roommates, and that one friend who always picks up the bill.
          </p>

          <div className="landing__cta-row">
            {isAuthenticated ? (
              <Link
                to="/dashboard"
                className="landing__cta landing__cta--primary"
              >
                Go to dashboard <FaArrowRight />
              </Link>
            ) : (
              <>
                <Link
                  to="/signup"
                  className="landing__cta landing__cta--primary"
                >
                  Get started — free <FaArrowRight />
                </Link>
                <Link to="/login" className="landing__cta landing__cta--ghost">
                  I already have an account
                </Link>
              </>
            )}
          </div>

          <ul className="landing__trust">
            <li>
              <FaCheckCircle /> Free forever
            </li>
            <li>
              <FaCheckCircle /> No card required
            </li>
            <li>
              <FaCheckCircle /> Cent-precise math
            </li>
          </ul>
        </div>

        {/* Stylized app preview — a teaser of the settlements UI */}
        <div className="landing__preview" aria-hidden>
          <div className="landing__preview-card">
            <div className="landing__preview-head">
              <div>
                <span className="landing__preview-label">Goa weekend</span>
                <strong>Pending settlements</strong>
              </div>
              <span className="landing__preview-chip">3 to clear</span>
            </div>
            <ul className="landing__preview-list">
              <li>
                <span className="landing__preview-av landing__preview-av--v">
                  AL
                </span>
                <span className="landing__preview-flow">
                  <em>Alex</em>
                  <FaArrow />
                  <em>Jordan</em>
                </span>
                <strong>₹825</strong>
              </li>
              <li>
                <span className="landing__preview-av landing__preview-av--k">
                  SA
                </span>
                <span className="landing__preview-flow">
                  <em>Sam</em>
                  <FaArrow />
                  <em>Jordan</em>
                </span>
                <strong>₹200</strong>
              </li>
              <li>
                <span className="landing__preview-av landing__preview-av--k">
                  SA
                </span>
                <span className="landing__preview-flow">
                  <em>Sam</em>
                  <FaArrow />
                  <em>Riley</em>
                </span>
                <strong>₹175</strong>
              </li>
            </ul>
            <div className="landing__preview-foot">
              <span>Simplified from 5 payments</span>
              <strong>Total ₹1,200</strong>
            </div>
          </div>

          {/* Floating accent card */}
          <div className="landing__preview-mini">
            <span className="landing__preview-mini-dot" />
            <div>
              <small>Net for Riley</small>
              <strong>+ ₹175</strong>
            </div>
          </div>
        </div>
      </section>

      {/* Features — each with a unique animated visualization */}
      <section className="landing__features">
        {/* Card 1: Split with anyone — avatars cascading in */}
        <article className="landing__feature">
          <div className="landing__viz landing__viz--avatars" aria-hidden>
            <span className="landing__viz-av landing__viz-av--1">SA</span>
            <span className="landing__viz-av landing__viz-av--2">AL</span>
            <span className="landing__viz-av landing__viz-av--3">JO</span>
            <span className="landing__viz-av landing__viz-av--4">RI</span>
            <span className="landing__viz-av landing__viz-av--plus">+</span>
          </div>
          <span className="landing__feature-icon">
            <FaUsers />
          </span>
          <h3>Split with anyone</h3>
          <p>
            Add a group, drop in names — no accounts required for members.
            Track expenses across trips, roommates, and one-off plans.
          </p>
        </article>

        {/* Card 2: Settle in fewest steps — 5 lines collapsing to 3 */}
        <article className="landing__feature">
          <div className="landing__viz landing__viz--simplify" aria-hidden>
            <div className="landing__viz-stack landing__viz-stack--many">
              <span /><span /><span /><span /><span />
            </div>
            <FaArrowRight className="landing__viz-arrow" />
            <div className="landing__viz-stack landing__viz-stack--few">
              <span /><span /><span />
            </div>
          </div>
          <span className="landing__feature-icon">
            <FaBolt />
          </span>
          <h3>Settle in fewest steps</h3>
          <p>
            We compute who owes whom and simplify the chain. See pair-wise
            debts or the minimum-transactions plan with one tap.
          </p>
        </article>

        {/* Card 3: Money math — animated calculation ticker */}
        <article className="landing__feature">
          <div className="landing__viz landing__viz--math" aria-hidden>
            <code className="landing__viz-line landing__viz-line--1">
              ₹1,000.00 ÷ 3
            </code>
            <code className="landing__viz-line landing__viz-line--2">
              = ₹333.34 + ₹333.33 + ₹333.33
            </code>
            <code className="landing__viz-line landing__viz-line--3">
              ✓ exactly ₹1,000.00
            </code>
          </div>
          <span className="landing__feature-icon">
            <FaShieldAlt />
          </span>
          <h3>Money math you can trust</h3>
          <p>
            Cent-precise arithmetic, never floating-point drift. Every paisa
            is accounted for — even with uneven splits and percentages.
          </p>
        </article>
      </section>

      {/* See it in action */}
      <section className="landing__action">
        <div className="landing__action-copy">
          <span className="landing__eyebrow">See it in action</span>
          <h2 className="landing__action-title">
            Add an expense.{" "}
            <span className="landing__title-accent">We do the math.</span>
          </h2>
          <p className="landing__lede">
            Type what you spent, pick who shared it, and we'll work out who
            owes what — to the paise. Auto-categorize from the description,
            simplify long chains of debts, and edit anything you got wrong.
          </p>

          <ul className="landing__action-points">
            <li>
              <span>
                <FaMagic />
              </span>
              <div>
                <strong>Auto-categorize</strong>
                <small>
                  Type "metro recharge" → Travel. Type "pizza" → Dining. No
                  picking from a dropdown.
                </small>
              </div>
            </li>
            <li>
              <span>
                <FaChartPie />
              </span>
              <div>
                <strong>Reports built-in</strong>
                <small>
                  Spend by member, by category, by month. Drill into who paid
                  what whenever you need it.
                </small>
              </div>
            </li>
            <li>
              <span>
                <FaBolt />
              </span>
              <div>
                <strong>Two views, your call</strong>
                <small>
                  Direct (pair-wise) shows real history. Simplified shows the
                  minimum payments. Switch with one tap.
                </small>
              </div>
            </li>
          </ul>
        </div>

        {/* Stacked mock cards */}
        <div className="landing__action-mocks" aria-hidden>
          <div className="landing__mock-expense">
            <div className="landing__mock-expense-head">
              <span className="landing__mock-cat">
                <FaUtensils />
              </span>
              <div>
                <strong>Dinner at Maya's</strong>
                <small>Today · Sam paid</small>
              </div>
              <span className="landing__mock-amt">₹2,400</span>
            </div>
            <div className="landing__mock-expense-split">
              <span>Split equally between</span>
              <div>
                <em>Sam</em>
                <em>Alex</em>
                <em>Riley</em>
                <em>Jordan</em>
              </div>
              <strong>₹600 each</strong>
            </div>
          </div>

          <div className="landing__mock-cat-bar">
            <div className="landing__mock-cat-row">
              <span>
                <FaUtensils /> Dining
              </span>
              <div className="landing__mock-bar">
                <div
                  style={{ width: "72%" }}
                  className="landing__mock-bar-fill landing__mock-bar-fill--a"
                />
              </div>
              <strong>₹3,400</strong>
            </div>
            <div className="landing__mock-cat-row">
              <span>
                <FaPlane /> Travel
              </span>
              <div className="landing__mock-bar">
                <div
                  style={{ width: "48%" }}
                  className="landing__mock-bar-fill landing__mock-bar-fill--b"
                />
              </div>
              <strong>₹2,200</strong>
            </div>
            <div className="landing__mock-cat-row">
              <span>
                <FaShoppingBag /> Shopping
              </span>
              <div className="landing__mock-bar">
                <div
                  style={{ width: "30%" }}
                  className="landing__mock-bar-fill landing__mock-bar-fill--c"
                />
              </div>
              <strong>₹1,400</strong>
            </div>
          </div>

          <div className="landing__mock-toast">
            <span className="landing__mock-toast-dot" />
            <div>
              <strong>Auto-categorized</strong>
              <small>"pizza for friends" → Dining 🍕</small>
            </div>
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="landing__closing">
        <h2>Ready to stop chasing receipts?</h2>
        <p>It takes 30 seconds to create a group and add your first expense.</p>
        {!isAuthenticated && (
          <Link to="/signup" className="landing__cta landing__cta--primary">
            Create your first group <FaArrowRight />
          </Link>
        )}
      </section>
    </main>
  );
};

export default Home;
