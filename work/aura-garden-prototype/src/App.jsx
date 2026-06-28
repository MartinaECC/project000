import { useState } from "react";
import {
  FlowerLotus,
  Leaf,
  Sparkle,
  StarFour,
  UsersThree,
} from "@phosphor-icons/react";

const screens = {
  onboarding: "screens/onboarding.webp",
  birth: "screens/birth-blueprint.webp",
  soul: "screens/soul-mirror.webp",
  tarot: "screens/tarot-mirror.webp",
  reveal: "screens/profile-reveal.webp",
  today: "screens/today.webp",
  test: "screens/test.webp",
  profile: "screens/profile.webp",
  growth: "screens/growth.webp",
  jewelry: "screens/jewelry.webp",
  order: "screens/order-confirm.webp",
  checkout: "screens/checkout.webp",
  tracker: "screens/production-tracker.webp",
  circle: "screens/circle.webp",
};

const navTargets = [
  { id: "today", label: "Today", icon: Leaf },
  { id: "test", label: "Test", icon: StarFour },
  { id: "growth", label: "Growth", icon: FlowerLotus },
  { id: "jewelry", label: "Jewelry", icon: Sparkle },
  { id: "circle", label: "Circle", icon: UsersThree },
];

const appTabs = new Set(navTargets.map((item) => item.id));

function App() {
  const [screen, setScreen] = useState("onboarding");

  const previousScreen = {
    birth: "onboarding",
    soul: "birth",
    tarot: "soul",
    reveal: "tarot",
    test: "today",
    profile: "reveal",
    growth: "today",
    jewelry: "growth",
    order: "jewelry",
    checkout: "order",
    tracker: "checkout",
    circle: "today",
  }[screen];
  const showNav = appTabs.has(screen) || screen === "profile";

  return (
    <main className="stage">
      <section className="phone" aria-label="Aura Garden high fidelity prototype">
        <img className="screen-art" src={screens[screen]} alt={`Aura Garden ${screen} screen`} />

        {previousScreen && (
          <Hotspot
            label="Back"
            className="hotspot back-hotspot"
            onClick={() => setScreen(previousScreen)}
          />
        )}

        {screen === "today" && (
          <>
            <Hotspot
              label="Open Soul Check-In"
              className="hotspot today-checkin"
              onClick={() => setScreen("test")}
            />
            <Hotspot
              label="Open Manifest Jewelry"
              className="hotspot today-jewelry"
              onClick={() => setScreen("jewelry")}
            />
          </>
        )}

        {screen === "onboarding" && (
          <>
            <Hotspot
              label="Create my spiritual profile"
              className="hotspot onboarding-primary"
              onClick={() => setScreen("birth")}
            />
            <Hotspot
              label="Skip to today's check-in"
              className="hotspot onboarding-secondary"
              onClick={() => setScreen("test")}
            />
          </>
        )}

        {screen === "birth" && (
          <>
            <Hotspot
              label="Continue to Soul Mirror"
              className="hotspot birth-primary"
              onClick={() => setScreen("soul")}
            />
            <Hotspot
              label="Skip birth blueprint"
              className="hotspot birth-secondary"
              onClick={() => setScreen("soul")}
            />
          </>
        )}

        {screen === "soul" && (
          <Hotspot
            label="Continue to Tarot Mirror"
            className="hotspot soul-primary"
            onClick={() => setScreen("tarot")}
          />
        )}

        {screen === "tarot" && (
          <Hotspot
            label="Continue to Profile Reveal"
            className="hotspot tarot-primary"
            onClick={() => setScreen("reveal")}
          />
        )}

        {screen === "test" && (
          <Hotspot
            label="Continue to Spiritual Profile"
            className="hotspot test-continue"
            onClick={() => setScreen("profile")}
          />
        )}

        {screen === "reveal" && (
          <Hotspot
            label="Reveal my profile"
            className="hotspot reveal-primary"
            onClick={() => setScreen("profile")}
          />
        )}

        {screen === "profile" && (
          <>
            <Hotspot
              label="Begin today's practice"
              className="hotspot profile-practice"
              onClick={() => setScreen("growth")}
            />
            <Hotspot
              label="Manifest as jewelry"
              className="hotspot profile-jewelry"
              onClick={() => setScreen("jewelry")}
            />
          </>
        )}

        {screen === "growth" && (
          <Hotspot
            label="Open unlocked Guardian Charm"
            className="hotspot growth-unlock"
            onClick={() => setScreen("jewelry")}
          />
        )}

        {screen === "jewelry" && (
          <>
            <Hotspot
              label="Begin custom order"
              className="hotspot jewelry-order"
              onClick={() => setScreen("order")}
            />
            <Hotspot
              label="Return to practice"
              className="hotspot jewelry-practice"
              onClick={() => setScreen("growth")}
            />
          </>
        )}

        {screen === "order" && (
          <>
            <Hotspot
              label="Start custom order"
              className="hotspot order-primary"
              onClick={() => setScreen("checkout")}
            />
            <Hotspot
              label="Edit manifestation"
              className="hotspot order-secondary"
              onClick={() => setScreen("jewelry")}
            />
          </>
        )}

        {screen === "checkout" && (
          <>
            <Hotspot
              label="Place deposit"
              className="hotspot checkout-primary"
              onClick={() => setScreen("tracker")}
            />
            <Hotspot
              label="Review order"
              className="hotspot checkout-secondary"
              onClick={() => setScreen("order")}
            />
          </>
        )}

        {screen === "tracker" && (
          <>
            <Hotspot
              label="Open growth practice"
              className="hotspot tracker-primary"
              onClick={() => setScreen("growth")}
            />
            <Hotspot
              label="View order details"
              className="hotspot tracker-secondary"
              onClick={() => setScreen("order")}
            />
          </>
        )}

        {showNav && (
          <div className="nav-bar" aria-label="Primary navigation">
            {navTargets.map((item) => (
              <button
                key={item.id}
                aria-label={item.label}
                className={screen === item.id ? "active" : ""}
                onClick={() => setScreen(item.id)}
              >
                <item.icon size={23} weight={screen === item.id ? "fill" : "regular"} />
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Hotspot({ label, className, onClick, style }) {
  return (
    <button
      aria-label={label}
      className={className}
      onClick={onClick}
      style={style}
      title={label}
    />
  );
}

export { App };
