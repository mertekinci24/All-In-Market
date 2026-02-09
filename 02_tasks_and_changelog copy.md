
# 📋 02_Tasks_and_Changelog.md

This is the **LIVING STATE** of the project.
**AI Instruction:** After completing a step, update this file immediately.

---

# 1. 🚦 Project Status Board
**Current Phase:** Phase 4 (AI & Optimization)
**Active Task:** Task 4.2 (Notification System)
**Last Completed:** Task 4.1 (AI Scenario Module)

---

# 2. 🗺️ Roadmap & Changelog

## Phase 1-3 Summary
*(See previous logs for Foundation, Data Engine, and Dashboard completion)*

---

## Phase 4: AI & Optimization (Hafta 4)
**Goal:** Integrating Gemini Pro for strategic advice.

### [x] Task 4.1: AI Scenario Module
- **Objective:** Connect Gemini API to analyze "Price Drop" simulations.
- **Changelog:**
  - **[2024-02-09]** Deployed `ai-scenario` Edge Function (Gemini 2.0 Flash + Rule-Based Fallback).
  - **[2024-02-09]** Implemented `useAiScenario` hook with JWT authentication.
  - **[2024-02-09]** Created `AiScenarioPage` with interactive simulation sliders and Markdown result renderer.
  - **[2024-02-09]** Added "Decision Engine" logic (MATCH/HOLD/INCREASE) based on profit delta.

### [ ] Task 4.2: Notification System
- **Objective:** Telegram Bot/Browser Notification integration for critical updates.
- **Changelog:**
  - *(Empty)*

### [ ] Task 4.3: Final Polish (The Premium Touch)
- **Objective:** Micro-animations, transition effects, and final bug fixes.
- **Changelog:**
  - *(Empty)*

---

# 3. 📉 Technical Debt & Known Issues
*> Use this section to log "Todo" items or hacks that need refactoring later.*

| ID | Severity | Description | Proposed Fix |
| :--- | :--- | :--- | :--- |
| **TD-002** | Medium | Using Bolt DB (Prototype) | Plan migration to PostgreSQL for Production |
| **TD-004** | Low | Hardcoded Category Colors | Move palette to global config theme |
