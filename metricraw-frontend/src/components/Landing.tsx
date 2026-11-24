import '../landing.css'

export default function Landing() {
  return (
    <div style={{ width: "100%", boxSizing: "border-box", background: "#E4EEF8", color: "#0B1F36", fontFamily: "'Jost',Arial,sans-serif", fontSize: "18px", lineHeight: "1.55", overflow: "clip" }}>

    <div style={{ position: "sticky", top: "0", zIndex: "50", height: "0" }}><header className="nv nb" style={{ position: "absolute", left: "0", right: "0", top: "0", display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between", padding: "16px 4vw", color: "#F4F8FC", boxSizing: "border-box" }}>
    <a href="#top" style={{ fontWeight: "500", fontSize: "26px", letterSpacing: "6px", textTransform: "uppercase" }}>Metric<em style={{ fontWeight: "300" }}>Raw</em></a>
    <nav style={{ display: "flex", flexWrap: "wrap", gap: "28px", alignItems: "center", fontSize: "15px" }}>
    <a href="#space">Features</a><a href="#goals">Goals</a><a href="#about">About</a><a href="#services">Platform</a><a href="#store">Store</a><a href="#ai">AI Coach</a><a href="/login">Log in</a><a href="/admin/login">Admin</a>
    </nav>
    <a className="pill" href="/register" style={{ background: "#F4F8FC", color: "#0B1F36" }}>Get early access</a>
    </header></div>

    <section id="top" style={{ position: "relative", minHeight: "760px", background: "#0A2342", color: "#F4F8FC", overflow: "hidden", display: "flex", flexDirection: "column" }}>
    <div className="kb c-hero" style={{ position: "absolute", inset: "0" }}></div>
    <div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(8,28,54,.62),rgba(8,28,54,.42) 45%,rgba(8,28,54,.72))" }}></div>


    <div style={{ position: "relative", zIndex: "2", flex: "1", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: "110px 5vw 130px", gap: "26px" }}>
    <div className="t2" style={{ fontSize: "13px", letterSpacing: "5px", textTransform: "uppercase", opacity: ".85" }}>AI-powered fitness + store</div>
    <h1 className="h t1" style={{ fontSize: "clamp(46px,9vw,128px)" }}>Track. Train.<br /><em>Transform.</em></h1>
    <p className="t3" style={{ margin: "0", maxWidth: "520px", fontSize: "19px", opacity: ".88" }}>Workouts, progress, gear and an AI coach in one calm, focused place.</p>
    <a className="t3" href="#space" style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", marginTop: "12px", fontSize: "15px" }}><span className="rg" style={{ width: "64px", height: "64px", border: "1.5px solid #F4F8FC", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center" }}><svg width="18" viewBox="0 0 18 20" aria-hidden="true"><path d="M3 2l13 8-13 8z" fill="#F4F8FC"></path></svg></span>Take a look inside</a>
    </div>
    </section>

    <div style={{ lineHeight: "0", background: "#0A2342", marginTop: "-1px" }}><svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: "100%", height: "70px", display: "block" }} aria-hidden="true"><path d="M0 40C120 10 220 62 360 32S600 2 720 36 960 66 1080 26 1320 8 1440 40V80H0z" fill="#BFD9F2"></path></svg></div>

    <section id="space" style={{ background: "#BFD9F2", padding: "70px 5vw 110px" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "56px", textAlign: "center" }}>
    <div className="rv" style={{ display: "flex", flexDirection: "column", gap: "20px", alignItems: "center" }}>
    <div style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase" }}>Why MetricRaw</div>
    <h2 className="h" style={{ fontSize: "clamp(34px,5.6vw,76px)" }}>Space to train.<br />Territory of <em>progress.</em></h2>
    <p style={{ margin: "0", maxWidth: "560px", color: "#3C526A" }}>Plan, log and see your results in one app, with an AI coach and a fitness store built in.</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1.25fr 1fr", gap: "20px", width: "100%", alignItems: "end" }}>
    <div className="pn sl" style={{ height: "340px", borderRadius: "6px", background: "#1A4F96" }}><div className="bg c-t1"></div><div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(8,28,54,.65))" }}></div><div style={{ position: "absolute", left: "20px", bottom: "16px", color: "#F4F8FC", fontSize: "14px", letterSpacing: "3px", textTransform: "uppercase" }}>Mobility</div></div>
    <div className="pn zm" style={{ height: "440px", borderRadius: "6px", background: "#1A4F96" }}><div className="bg c-t2"></div><div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(8,28,54,.65))" }}></div><div style={{ position: "absolute", left: "20px", bottom: "16px", color: "#F4F8FC", fontSize: "14px", letterSpacing: "3px", textTransform: "uppercase" }}>Gear</div></div>
    <div className="pn sr" style={{ height: "340px", borderRadius: "6px", background: "#3C86D6" }}><div className="bg c-t3"></div><div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(0,0,0,0) 55%,rgba(8,28,54,.65))" }}></div><div style={{ position: "absolute", left: "20px", bottom: "16px", color: "#F4F8FC", fontSize: "14px", letterSpacing: "3px", textTransform: "uppercase" }}>Diet</div></div>
    </div>
    </div>
    </section>

    <section id="goals" style={{ padding: "100px 5vw" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "50px" }}>
    <div className="rv" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}><div style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase" }}>Your goal</div><h2 className="h" style={{ fontSize: "clamp(34px,5.6vw,76px)" }}>Different goals —<br />one <em>feeling</em></h2></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))", gap: "20px" }}>
    <div className="pn sl" style={{ height: "420px", color: "#F4F8FC" }}><div className="bg c-g1"></div><div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(8,28,54,.72))" }}></div><div style={{ position: "absolute", left: "26px", right: "26px", bottom: "26px" }}><div className="h" style={{ fontSize: "34px" }}>Muscle <em>gain</em></div><div style={{ fontSize: "16px", opacity: ".9", marginTop: "6px" }}>Structured plans with sets, reps and rest.</div></div></div>
    <div className="pn zm" style={{ height: "420px", color: "#F4F8FC", marginTop: "40px" }}><div className="bg c-g2"></div><div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(8,28,54,.72))" }}></div><div style={{ position: "absolute", left: "26px", right: "26px", bottom: "26px" }}><div className="h" style={{ fontSize: "34px" }}>Weight <em>management</em></div><div style={{ fontSize: "16px", opacity: ".9", marginTop: "6px" }}>Track progress you can actually see.</div></div></div>
    <div className="pn sr" style={{ height: "420px", color: "#F4F8FC" }}><div className="bg c-g3"></div><div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(0,0,0,0) 40%,rgba(8,28,54,.72))" }}></div><div style={{ position: "absolute", left: "26px", right: "26px", bottom: "26px" }}><div className="h" style={{ fontSize: "34px" }}>General <em>fitness</em></div><div style={{ fontSize: "16px", opacity: ".9", marginTop: "6px" }}>Build a habit with streaks and history.</div></div></div>
    </div>
    </div>
    </section>

    <section id="about" style={{ background: "#CFE0F2", padding: "100px 5vw" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "56px", alignItems: "center" }}>
    <div className="pn sl" style={{ height: "560px", borderRadius: "6px" }}><div className="bg c-t1"></div></div>
    <div className="sr" style={{ display: "flex", flexDirection: "column", gap: "22px" }}>
    <div style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase" }}>About MetricRaw</div>
    <h2 className="h" style={{ fontSize: "clamp(34px,5vw,64px)" }}>One platform for your <em>whole routine</em></h2>
    <p style={{ margin: "0", color: "#3C526A" }}>MetricRaw brings fitness management, AI-powered recommendations, progress tracking and a fitness store together in one place.</p>
    <p style={{ margin: "0", color: "#3C526A" }}>We build the reliable core first, then add AI step by step, so every feature stays testable, dependable and easy to grow.</p>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: "20px", borderTop: "1px solid rgba(11,31,54,.25)", paddingTop: "22px" }}>
    <div><div className="h" style={{ fontSize: "22px" }}>Core first</div><div style={{ fontSize: "15px", color: "#4A6078" }}>Accounts, plans, progress and store before AI.</div></div>
    <div><div className="h" style={{ fontSize: "22px" }}>AI with guardrails</div><div style={{ fontSize: "15px", color: "#4A6078" }}>Rules set limits, AI personalizes inside them.</div></div>
    <div><div className="h" style={{ fontSize: "22px" }}>Your data</div><div style={{ fontSize: "15px", color: "#4A6078" }}>Private by default, deletable on request.</div></div>
    </div>
    </div>
    </div>
    </section>

    <div style={{ lineHeight: "0", background: "#CFE0F2" }}><svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: "100%", height: "70px", display: "block" }} aria-hidden="true"><path d="M0 36C140 66 260 6 400 34S640 70 760 30 1000 4 1120 36 1340 64 1440 30V80H0z" fill="#0E56A0"></path></svg></div>

    <section id="services" style={{ background: "#0E56A0", color: "#E2EEF9", padding: "60px 5vw 110px" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "50px" }}>
    <div className="rv" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}><div style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase" }}>Platform</div><h2 className="h" style={{ fontSize: "clamp(34px,5.6vw,76px)" }}>Everything for your <em>movement</em></h2></div>
    <div>
    <div className="row rv" style={{ display: "grid", gridTemplateColumns: "70px 1fr 1.2fr", gap: "20px", padding: "30px 12px", borderTop: "1px solid rgba(226,238,249,.3)", alignItems: "center" }}><span style={{ fontSize: "14px", letterSpacing: "3px" }}>01</span><span className="h t" style={{ fontSize: "clamp(24px,3.4vw,44px)" }}>Fitness management</span><span style={{ color: "#BBD3EC", fontSize: "16px" }}>Exercise library by muscle group, difficulty and equipment. Plans, workout history and streaks.</span></div>
    <div className="row rv" style={{ display: "grid", gridTemplateColumns: "70px 1fr 1.2fr", gap: "20px", padding: "30px 12px", borderTop: "1px solid rgba(226,238,249,.3)", alignItems: "center" }}><span style={{ fontSize: "14px", letterSpacing: "3px" }}>02</span><span className="h t" style={{ fontSize: "clamp(24px,3.4vw,44px)" }}>Dashboard</span><span style={{ color: "#BBD3EC", fontSize: "16px" }}>Today's workout, weight and progress charts, goal tracking and consistency, on any device.</span></div>
    <div className="row rv" style={{ display: "grid", gridTemplateColumns: "70px 1fr 1.2fr", gap: "20px", padding: "30px 12px", borderTop: "1px solid rgba(226,238,249,.3)", alignItems: "center" }}><span style={{ fontSize: "14px", letterSpacing: "3px" }}>03</span><span className="h t" style={{ fontSize: "clamp(24px,3.4vw,44px)" }}>Fitness store</span><span style={{ color: "#BBD3EC", fontSize: "16px" }}>Search, filter, wishlist, cart and orders. Admins manage products and stock.</span></div>
    <div className="row rv" style={{ display: "grid", gridTemplateColumns: "70px 1fr 1.2fr", gap: "20px", padding: "30px 12px", borderTop: "1px solid rgba(226,238,249,.3)", borderBottom: "1px solid rgba(226,238,249,.3)", alignItems: "center" }}><span style={{ fontSize: "14px", letterSpacing: "3px" }}>04</span><span className="h t" style={{ fontSize: "clamp(24px,3.4vw,44px)" }}>AI coach</span><span style={{ color: "#BBD3EC", fontSize: "16px" }}>Workout generator, fitness chat, general nutrition ideas and plain-language progress notes.</span></div>
    </div>
    </div>
    </section>

    <div style={{ lineHeight: "0", background: "#0E56A0" }}><svg viewBox="0 0 1440 80" preserveAspectRatio="none" style={{ width: "100%", height: "70px", display: "block" }} aria-hidden="true"><path d="M0 40C140 8 280 64 420 34S660 4 780 38 1020 68 1140 28 1340 12 1440 38V80H0z" fill="#BFD9F2"></path></svg></div>

    <section id="store" style={{ background: "#BFD9F2", padding: "60px 5vw 110px" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "50px" }}>
    <div className="rv" style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "16px", alignItems: "center" }}><div style={{ fontSize: "12px", letterSpacing: "5px", textTransform: "uppercase" }}>Fitness store</div><h2 className="h" style={{ fontSize: "clamp(34px,5.6vw,76px)" }}>Gear for every <em>session</em></h2><p style={{ margin: "0", maxWidth: "560px", color: "#3C526A" }}>A built-in store, so the equipment for your plan is one tap away.</p></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(300px,1fr))", gap: "24px", alignItems: "stretch" }}>
    <div className="pn sl" style={{ minHeight: "460px", borderRadius: "6px" }}><div className="bg c-t2"></div><div style={{ position: "absolute", inset: "0", background: "linear-gradient(180deg,rgba(0,0,0,0) 60%,rgba(8,28,54,.6))" }}></div><div style={{ position: "absolute", left: "24px", bottom: "20px", color: "#F4F8FC", fontSize: "14px", letterSpacing: "3px", textTransform: "uppercase" }}>Mats · weights · essentials</div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "16px" }}><div className="cd rv" style={{ background: "rgba(255,255,255,.45)", borderRadius: "6px", padding: "22px" }}><div style={{ fontSize: "13px", letterSpacing: "3px" }}>01</div><div className="h" style={{ fontSize: "22px", margin: "6px 0" }}>Categories &amp; details</div><div style={{ fontSize: "15px", color: "#3C526A" }}>Browse by category, with images, price and live stock.</div></div><div className="cd rv" style={{ background: "rgba(255,255,255,.45)", borderRadius: "6px", padding: "22px" }}><div style={{ fontSize: "13px", letterSpacing: "3px" }}>02</div><div className="h" style={{ fontSize: "22px", margin: "6px 0" }}>Search &amp; filter</div><div style={{ fontSize: "15px", color: "#3C526A" }}>Find the right gear quickly.</div></div><div className="cd rv" style={{ background: "rgba(255,255,255,.45)", borderRadius: "6px", padding: "22px" }}><div style={{ fontSize: "13px", letterSpacing: "3px" }}>03</div><div className="h" style={{ fontSize: "22px", margin: "6px 0" }}>Cart &amp; wishlist</div><div style={{ fontSize: "15px", color: "#3C526A" }}>Save favorites and build your order.</div></div><div className="cd rv" style={{ background: "rgba(255,255,255,.45)", borderRadius: "6px", padding: "22px" }}><div style={{ fontSize: "13px", letterSpacing: "3px" }}>04</div><div className="h" style={{ fontSize: "22px", margin: "6px 0" }}>Checkout &amp; orders</div><div style={{ fontSize: "15px", color: "#3C526A" }}>Check out and revisit your order history.</div></div><div className="cd rv" style={{ background: "rgba(255,255,255,.45)", borderRadius: "6px", padding: "22px" }}><div style={{ fontSize: "13px", letterSpacing: "3px" }}>05</div><div className="h" style={{ fontSize: "22px", margin: "6px 0" }}>Smart picks</div><div style={{ fontSize: "15px", color: "#3C526A" }}>AI product suggestions, guided by store rules.</div></div><div className="cd rv" style={{ background: "rgba(255,255,255,.45)", borderRadius: "6px", padding: "22px" }}><div style={{ fontSize: "13px", letterSpacing: "3px" }}>06</div><div className="h" style={{ fontSize: "22px", margin: "6px 0" }}>Admin tools</div><div style={{ fontSize: "15px", color: "#3C526A" }}>Manage products, inventory and orders.</div></div></div>
    </div>
    <div style={{ textAlign: "center" }}><a className="pill rv" href="/register" style={{ background: "#0E56A0", color: "#F4F8FC" }}>Get early access</a></div>
    </div>
    </section>

    <section id="ai" style={{ padding: "110px 5vw 90px" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto", display: "flex", flexDirection: "column", gap: "46px" }}>
    <h2 className="h rv" style={{ fontSize: "clamp(34px,5.6vw,76px)", maxWidth: "900px" }}>Rules set the limits.<br /><em>AI personalizes.</em></h2>
    <div style={{ height: "2px", background: "rgba(11,31,54,.18)" }}><div className="lnx" style={{ height: "2px", background: "#0E56A0" }}></div></div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "28px" }}>
    <div className="rv"><div style={{ fontSize: "13px", letterSpacing: "3px" }}>01</div><div className="h" style={{ fontSize: "24px", margin: "6px 0" }}>Share your goal</div><div style={{ color: "#4A6078", fontSize: "16px" }}>Goal, experience and training days per week.</div></div>
    <div className="rv"><div style={{ fontSize: "13px", letterSpacing: "3px" }}>02</div><div className="h" style={{ fontSize: "24px", margin: "6px 0" }}>Rules pick structure</div><div style={{ color: "#4A6078", fontSize: "16px" }}>Approved, safe structures for your level.</div></div>
    <div className="rv"><div style={{ fontSize: "13px", letterSpacing: "3px" }}>03</div><div className="h" style={{ fontSize: "24px", margin: "6px 0" }}>AI tailors the plan</div><div style={{ color: "#4A6078", fontSize: "16px" }}>Personal suggestions and explanations.</div></div>
    <div className="rv"><div style={{ fontSize: "13px", letterSpacing: "3px" }}>04</div><div className="h" style={{ fontSize: "24px", margin: "6px 0" }}>Validated and saved</div><div style={{ color: "#4A6078", fontSize: "16px" }}>Regenerate or modify any time.</div></div>
    </div>
    <div className="rv" style={{ display: "flex", flexWrap: "wrap", gap: "12px", marginTop: "10px", fontSize: "15px" }}>
    <span style={{ border: "1.5px solid #0B1F36", borderRadius: "999px", padding: "10px 20px" }}><b style={{ fontWeight: "500" }}>MVP</b> · app and store</span>
    <span style={{ border: "1.5px solid #0B1F36", borderRadius: "999px", padding: "10px 20px" }}><b style={{ fontWeight: "500" }}>AI v1</b> · generator and chat</span>
    <span style={{ border: "1.5px solid #0B1F36", borderRadius: "999px", padding: "10px 20px" }}><b style={{ fontWeight: "500" }}>AI v2</b> · history-based picks</span>
    <span style={{ border: "1.5px dashed #0B1F36", borderRadius: "999px", padding: "10px 20px" }}><b style={{ fontWeight: "500" }}>Next</b> · camera form check</span>
    </div>
    </div>
    </section>

    <section id="join" style={{ background: "#0A2342", color: "#F4F8FC", padding: "120px 5vw 120px", textAlign: "center", position: "relative", overflow: "hidden" }}>
    <svg className="lf" style={{ position: "absolute", left: "-30px", bottom: "-30px", width: "300px", opacity: ".9" }} viewBox="0 0 300 300" aria-hidden="true"><path d="M20 300C0 180 60 60 200 10 190 120 130 220 20 300z" fill="#0B2F5C"></path></svg>
    <svg className="lf2" style={{ position: "absolute", right: "-30px", bottom: "-30px", width: "320px", transform: "scaleX(-1)", opacity: ".9" }} viewBox="0 0 300 300" aria-hidden="true"><path d="M20 300C0 180 60 60 200 10 190 120 130 220 20 300z" fill="#124A8A"></path></svg>
    <div style={{ position: "relative", maxWidth: "900px", margin: "0 auto", display: "flex", flexDirection: "column", alignItems: "center", gap: "26px" }}>
    <h2 className="h rv" style={{ fontSize: "clamp(40px,7vw,96px)" }}>Ready to <em>transform?</em></h2>
    <p className="rv" style={{ margin: "0", maxWidth: "520px", opacity: ".85" }}>Join the early-access list and be first to build your plan.</p>
    <a className="pill rv" href="/register" style={{ background: "#BFD9F2", color: "#0B1F36" }}>Get early access</a>
    </div>
    </section>

    <footer id="contact" className="nv" style={{ background: "#071A33", color: "#F4F8FC", padding: "80px 5vw 30px" }}>
    <div style={{ maxWidth: "1200px", margin: "0 auto" }}>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(210px,1fr))", gap: "44px", paddingBottom: "56px", borderBottom: "1px solid rgba(244,248,252,.15)" }}>
    <div><div style={{ fontWeight: "500", fontSize: "26px", letterSpacing: "6px", textTransform: "uppercase" }}>Metric<em style={{ fontWeight: "300" }}>Raw</em></div><p style={{ margin: "14px 0 0", fontSize: "15px", opacity: ".7", maxWidth: "280px" }}>Track. Train. Transform. Fitness management, an AI coach and a store in one place.</p></div>
    <div><div style={{ fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", opacity: ".6", marginBottom: "16px" }}>Explore</div><div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "16px" }}><a href="#space">Features</a><a href="#goals">Goals</a><a href="#about">About</a><a href="#services">Platform</a><a href="#store">Store</a><a href="#ai">AI Coach</a></div></div>
    <div><div style={{ fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", opacity: ".6", marginBottom: "16px" }}>Contact</div><div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "16px" }}><a href="mailto:hello@metricraw.com">hello@metricraw.com</a><a href="mailto:support@metricraw.com">support@metricraw.com</a><a href="tel:+910000000000">+91 00000 00000</a><span style={{ opacity: ".8", fontSize: "15px" }}>Your street address,<br />City, State, Country</span><span style={{ opacity: ".8", fontSize: "15px" }}>Mon–Sat · 9:00 AM – 6:00 PM</span></div></div>
    <div><div style={{ fontSize: "12px", letterSpacing: "4px", textTransform: "uppercase", opacity: ".6", marginBottom: "16px" }}>Follow</div><div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "16px" }}><a href="#">Instagram</a><a href="#">YouTube</a><a href="#">LinkedIn</a><a href="#">X (Twitter)</a></div></div>
    </div>
    <div style={{ display: "flex", flexWrap: "wrap", gap: "14px", justifyContent: "space-between", paddingTop: "26px", fontSize: "14px", opacity: ".65" }}>
    <span>© 2026 MetricRaw. All rights reserved.</span>
    <span style={{ display: "flex", gap: "22px", flexWrap: "wrap" }}><a href="#">Privacy</a><a href="#">Terms</a><span>AI output is guidance, not medical advice.</span></span>
    </div>
    </div>
    </footer>

    </div>
  )
}
