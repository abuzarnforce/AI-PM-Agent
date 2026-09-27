/**
 * PM Agent — Interactive Prototype Logic & State Engine
 * High-fidelity, reactive, with comprehensive realistic dummy data.
 */

(function () {
  "use strict";

  // --- State Store ---
  const state = {
    currentTab: "home",
    theme: "dark",
    isSidebarCollapsed: false,
    sprint: {
      number: 42,
      name: "Sprint 42 (SSO & Enterprise Readiness)",
      daysLeft: 4,
      velocity: 48,
      velocityTarget: 54,
      qaPassRate: 96.4,
      totalTests: 53,
      passedTests: 51,
      blockedTests: 3,
      commitsToday: 17,
      prsMerged30d: 76
    },
    drafts: [
      {
        id: "DRAFT-104",
        key: "ONEHR-115",
        title: "Multi-tenant SSO Session Invalidation on Demotion",
        status: "Ready for Grooming",
        author: "Gemini Agent (Automated from QA-Sheet)",
        timestamp: "Today at 2:14 PM",
        gherkin: `Feature: Multi-tenant SSO Session Invalidation
  As an Enterprise Security Admin
  I want user sessions revoked immediately upon permission demotion
  So that former admins cannot access restricted HR payroll data

  Scenario: Session revocation on privilege demotion
    Given an active enterprise user "alex@acme.com" with "ADMIN" role
    When the organization admin changes Alexander's role to "MEMBER" in IAM
    Then all active OAuth refresh tokens for "alex@acme.com" MUST be revoked
    And the subsequent API call to "/api/v2/payroll" returns HTTP 401 Unauthorized
    And an audit log is emitted with action "IAM_SESSION_REVOKED"`
      },
      {
        id: "DRAFT-105",
        key: "ONEHR-336",
        title: "Automated Retry Exponential Backoff for Slack Webhooks",
        status: "Needs Triage",
        author: "Gemini Agent (Automated from Sentry Log)",
        timestamp: "Today at 11:30 AM",
        gherkin: `Feature: Webhook Delivery Reliability
  Scenario: Exponential backoff on rate limit
    Given an outgoing notification webhook for Slack channel "#deployments"
    When Slack returns HTTP 429 Too Many Requests with "Retry-After: 30"
    Then PM Agent schedules retry attempt 1 at 30 seconds
    And max retry attempts is bounded to 5 iterations`
      }
    ],
    testCases: [
      { id: "TC-401", title: "SAML 2.0 Identity Provider Handshake", module: "Auth / SSO", status: "Pass", duration: "1.2s", ticket: "ONEHR-88" },
      { id: "TC-402", title: "OAuth2 Token Demotion Revocation", module: "Auth / SSO", status: "Blocked", duration: "-", ticket: "ONEHR-115" },
      { id: "TC-403", title: "Enterprise Session Inactivity Timeout", module: "Auth / SSO", status: "Blocked", duration: "-", ticket: "ONEHR-336" },
      { id: "TC-404", title: "Payroll Batch CSV Export 50,000 rows", module: "Payroll", status: "Pass", duration: "4.8s", ticket: "ONEHR-72" },
      { id: "TC-405", title: "Tax Calculation Rounding Accuracy (US-CA)", module: "Payroll", status: "Pass", duration: "0.4s", ticket: "ONEHR-95" },
      { id: "TC-406", title: "Direct Deposit Routing Validation", module: "Banking", status: "Pass", duration: "0.8s", ticket: "ONEHR-110" },
      { id: "TC-407", title: "Leave Accrual Carryover Policy Rule", module: "Leaves", status: "Fail", duration: "2.1s", ticket: "ONEHR-140" },
      { id: "TC-408", title: "PDF Paystub Generator Font Glyphs", module: "Payroll", status: "Pass", duration: "3.2s", ticket: "ONEHR-82" }
    ],
    feedbackItems: [
      {
        id: "FB-201",
        customer: "Acme Corp (Enterprise ARR $240k)",
        source: "Intercom",
        time: "42m ago",
        sentiment: "Urgent",
        text: "Our payroll team experienced a 4-second delay during 10k employee CSV export. We need this optimized before month-end closing.",
        recommendation: "Batch streaming pagination on payroll export engine."
      },
      {
        id: "FB-202",
        customer: "Stripe Labs (Enterprise ARR $180k)",
        source: "Zendesk",
        time: "2h ago",
        sentiment: "Neutral",
        text: "Would love to see dark mode support on the manager approval portal. Our engineers are requesting it.",
        recommendation: "Add CSS theme switcher to self-service portal."
      },
      {
        id: "FB-203",
        customer: "Linear Global (Growth ARR $60k)",
        source: "Gong Call",
        time: "5h ago",
        sentiment: "Positive",
        text: "The new automated Slack notifications for pending leave requests cut our approval times by 60%. Huge win!",
        recommendation: "Highlight in case study and expand to MS Teams."
      }
    ]
  };

  // --- DOM Elements ---
  const el = {
    sidebar: document.getElementById("app-sidebar"),
    sidebarToggle: document.getElementById("sidebar-toggle-btn"),
    navItems: document.querySelectorAll(".nav-item"),
    panelViews: document.querySelectorAll(".panel-view"),
    themeToggle: document.getElementById("theme-toggle-btn"),
    searchTrigger: document.getElementById("global-search-trigger"),
    cmdPalette: document.getElementById("cmd-palette-modal"),
    cmdInput: document.getElementById("cmd-search-input"),
    cmdResults: document.getElementById("cmd-results-list"),
    toastContainer: document.getElementById("toast-container"),
    modalBackdrop: document.getElementById("modal-backdrop"),
    modalTitle: document.getElementById("modal-title"),
    modalBody: document.getElementById("modal-body"),
    modalConfirmBtn: document.getElementById("modal-confirm-btn"),
    modalCancelBtn: document.getElementById("modal-cancel-btn"),
    modalCloseBtn: document.getElementById("modal-close-btn"),
    // Chat elements
    chatHistory: document.getElementById("chat-history"),
    chatInput: document.getElementById("chat-input"),
    chatSendBtn: document.getElementById("chat-send-btn"),
    promptChips: document.querySelectorAll(".prompt-chip-btn"),
    // QA filter elements
    qaSearchInput: document.getElementById("qa-search-input"),
    qaFilterBtns: document.querySelectorAll(".qa-filter-btn"),
    qaTableBody: document.getElementById("qa-table-body")
  };

  // --- Initial Setup ---
  function init() {
    setupNavigation();
    setupChatAgent();
    setupQaTable();
    setupDraftsApproval();
    setupFeedbackActions();
    setupCommandPalette();
    setupThemeToggle();
    renderAllPanels();

    // Check URL hash on load
    const hash = window.location.hash.replace("#", "");
    if (hash && document.getElementById(`panel-${hash}`)) {
      navigateTo(hash);
    }
  }

  // --- Toast System ---
  function showToast(message, type = "info") {
    const toast = document.createElement("div");
    toast.className = "toast";
    let icon = "✦";
    if (type === "success") icon = "✓";
    if (type === "warning") icon = "⚠️";

    toast.innerHTML = `
      <span style="color: ${type === 'success' ? 'var(--status-positive)' : 'var(--accent-primary)'}; font-weight: bold;">${icon}</span>
      <span>${message}</span>
    `;

    el.toastContainer.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transform = "translateX(40px)";
      toast.style.transition = "all 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3800);
  }

  // --- Navigation ---
  function setupNavigation() {
    el.navItems.forEach((item) => {
      item.addEventListener("click", (e) => {
        e.preventDefault();
        const tab = item.getAttribute("data-tab");
        if (tab) navigateTo(tab);
      });
    });

    if (el.sidebarToggle) {
      el.sidebarToggle.addEventListener("click", () => {
        state.isSidebarCollapsed = !state.isSidebarCollapsed;
        el.sidebar.classList.toggle("collapsed", state.isSidebarCollapsed);
      });
    }

    window.addEventListener("popstate", () => {
      const hash = window.location.hash.replace("#", "");
      if (hash && document.getElementById(`panel-${hash}`)) {
        navigateTo(hash, false);
      }
    });
  }

  function navigateTo(tabName, updateHash = true) {
    state.currentTab = tabName;

    // Update nav active styles
    el.navItems.forEach((item) => {
      item.classList.toggle("active", item.getAttribute("data-tab") === tabName);
    });

    // Update views
    el.panelViews.forEach((view) => {
      view.classList.toggle("active", view.id === `panel-${tabName}`);
    });

    if (updateHash) {
      history.pushState(null, "", `#${tabName}`);
    }

    // Scroll to top
    const container = document.querySelector(".panel-container");
    if (container) container.scrollTop = 0;
  }

  // --- Chat Agent Engine ---
  function setupChatAgent() {
    if (!el.chatSendBtn || !el.chatInput) return;

    el.chatSendBtn.addEventListener("click", () => handleSendChat());
    el.chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSendChat();
      }
    });

    el.promptChips.forEach((chip) => {
      chip.addEventListener("click", () => {
        const text = chip.getAttribute("data-prompt") || chip.textContent.trim();
        el.chatInput.value = text;
        handleSendChat();
      });
    });
  }

  function handleSendChat() {
    const query = el.chatInput.value.trim();
    if (!query) return;

    el.chatInput.value = "";

    // 1. Append User Message
    appendMessage("user", query);

    // 2. Append Agent Working Theater Box
    const theaterId = "theater-" + Date.now();
    const agentMsgRow = document.createElement("div");
    agentMsgRow.className = "message-row";
    agentMsgRow.innerHTML = `
      <div class="message-avatar agent">
        <svg width="18" height="18" viewBox="0 0 28 28">
          <g transform="scale(1)">
            <path d="M2 3.5 C7 3.5 8 8 12 8 M2 8 H12 M2 12.5 C7 12.5 8 8 12 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>
            <circle cx="13" cy="8" r="2.2" fill="currentColor"/>
          </g>
        </svg>
      </div>
      <div class="message-body" style="flex: 1;">
        <div class="reasoning-box" id="${theaterId}">
          <div class="reasoning-step">
            <span class="step-status-icon spinner">⟳</span>
            <span>Understanding question context...</span>
          </div>
        </div>
      </div>
    `;
    el.chatHistory.appendChild(agentMsgRow);
    el.chatHistory.scrollTop = el.chatHistory.scrollHeight;

    // Simulate multi-step reasoning progression
    const theaterBox = document.getElementById(theaterId);

    setTimeout(() => {
      if (theaterBox) {
        theaterBox.innerHTML = `
          <div class="reasoning-step"><span class="step-status-icon">✓</span><span>Parsed intent: Sprint Blocker & Triage Analysis</span></div>
          <div class="reasoning-step"><span class="step-status-icon spinner">⟳</span><span>Querying Jira API (Project ONEHR, Sprint 42)...</span></div>
        `;
      }
    }, 700);

    setTimeout(() => {
      if (theaterBox) {
        theaterBox.innerHTML += `
          <div class="reasoning-step"><span class="step-status-icon">✓</span><span>Cross-referencing QA test matrix (qa-sheet.xlsx)...</span></div>
          <div class="reasoning-step"><span class="step-status-icon spinner">⟳</span><span>Synthesizing root causes and citing ticket keys...</span></div>
        `;
        el.chatHistory.scrollTop = el.chatHistory.scrollHeight;
      }
    }, 1500);

    setTimeout(() => {
      // Final synthesized answer
      if (theaterBox) {
        theaterBox.innerHTML = `
          <div class="reasoning-step"><span class="step-status-icon">✓</span><span>Understood question</span></div>
          <div class="reasoning-step"><span class="step-status-icon">✓</span><span>Searched Jira (12 issues inspected)</span></div>
          <div class="reasoning-step"><span class="step-status-icon">✓</span><span>Cross-referenced QA test matrix (3 blockers located)</span></div>
        `;
      }

      const answerBubble = document.createElement("div");
      answerBubble.className = "message-bubble";

      if (query.toLowerCase().includes("block") || query.toLowerCase().includes("sprint")) {
        answerBubble.innerHTML = `
          <p><strong>There are 3 critical blockers impacting Sprint 42 release readiness:</strong></p>
          <ul style="margin: 10px 0 10px 20px; line-height: 1.7;">
            <li>
              <span class="citation-chip" onclick="window.inspectTicket('ONEHR-115')">ONEHR-115</span>
              <strong>OAuth2 Session Demotion:</strong> Refresh tokens are failing to invalidate when user role changes from Admin to Member in test scenario <code>TC-402</code>.
            </li>
            <li>
              <span class="citation-chip" onclick="window.inspectTicket('ONEHR-336')">ONEHR-336</span>
              <strong>Slack Webhook Rate-Limiter:</strong> Webhook retry logic lacks exponential backoff causing dropouts on high-volume alerts.
            </li>
            <li>
              <span class="citation-chip" onclick="window.inspectTicket('ONEHR-140')">ONEHR-140</span>
              <strong>Leave Accrual Overflow:</strong> Year-end rollover calculation triggers an unhandled null exception for part-time contractors.
            </li>
          </ul>
          <p style="color: var(--text-secondary); margin-top: 8px;">
            <strong>Recommendation:</strong> Human sign-off is required for <span class="citation-chip" onclick="window.navigateToTab('drafts')">Draft ONEHR-115</span> before pushing fixes directly to Jira.
          </p>
          <div style="margin-top: 14px; display: flex; gap: 8px;">
            <button class="btn btn-primary btn-sm" onclick="window.navigateToTab('drafts')">Review Pending Drafts</button>
            <button class="btn btn-secondary btn-sm" onclick="window.navigateToTab('projects')">Inspect QA Sheet</button>
          </div>
        `;
      } else {
        answerBubble.innerHTML = `
          <p>Based on Jira and GitHub telemetry for <strong>OneHR Enterprise Suite</strong>, our current sprint velocity is at <strong>88.8%</strong> with 48 of 54 story points completed. 17 commits have been merged today across <code>NForce-One/NForce-OneHR</code>.</p>
          <p style="margin-top: 8px;">All PRDs and acceptance criteria cite active tickets and regression test suites.</p>
        `;
      }

      agentMsgRow.querySelector(".message-body").appendChild(answerBubble);
      el.chatHistory.scrollTop = el.chatHistory.scrollHeight;
    }, 2400);
  }

  function appendMessage(role, text) {
    const row = document.createElement("div");
    row.className = `message-row ${role}`;
    row.innerHTML = `
      <div class="message-avatar ${role}">
        ${role === 'agent' ? '✦' : 'AS'}
      </div>
      <div class="message-body">
        <div class="message-bubble">${text}</div>
      </div>
    `;
    el.chatHistory.appendChild(row);
    el.chatHistory.scrollTop = el.chatHistory.scrollHeight;
  }

  // --- QA Table Management ---
  function setupQaTable() {
    renderQaTable(state.testCases);

    if (el.qaSearchInput) {
      el.qaSearchInput.addEventListener("input", (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = state.testCases.filter(
          (tc) => tc.title.toLowerCase().includes(query) || tc.id.toLowerCase().includes(query) || tc.ticket.toLowerCase().includes(query)
        );
        renderQaTable(filtered);
      });
    }

    el.qaFilterBtns.forEach((btn) => {
      btn.addEventListener("click", () => {
        el.qaFilterBtns.forEach((b) => b.classList.remove("active"));
        btn.classList.add("active");
        const filter = btn.getAttribute("data-filter");
        if (filter === "all") {
          renderQaTable(state.testCases);
        } else {
          renderQaTable(state.testCases.filter((tc) => tc.status.toLowerCase() === filter.toLowerCase()));
        }
      });
    });
  }

  function renderQaTable(tests) {
    if (!el.qaTableBody) return;
    el.qaTableBody.innerHTML = tests
      .map(
        (t) => `
      <tr>
        <td style="font-family: var(--font-mono); font-weight: 600; color: var(--text-primary);">${t.id}</td>
        <td>
          <div style="font-weight: 550; color: var(--text-primary);">${t.title}</div>
          <div style="font-size: 11.5px; color: var(--text-tertiary);">${t.module}</div>
        </td>
        <td>
          <span class="status-pill ${t.status.toLowerCase()}">${t.status}</span>
        </td>
        <td style="font-family: var(--font-mono); font-size: 12px;">${t.duration}</td>
        <td>
          <span class="citation-chip" onclick="window.inspectTicket('${t.ticket}')">${t.ticket}</span>
        </td>
        <td>
          <button class="btn btn-outline btn-sm" onclick="window.inspectTestLog('${t.id}')">Logs</button>
        </td>
      </tr>
    `
      )
      .join("");
  }

  // --- Drafts & Approvals ---
  function setupDraftsApproval() {
    const approveBtn = document.getElementById("approve-draft-btn");
    if (approveBtn) {
      approveBtn.addEventListener("click", () => {
        openModal(
          "Confirm Direct Jira Push",
          `
          <p style="margin-bottom: 14px; font-size: 14px; color: var(--text-primary);">
            You are about to push <strong>ONEHR-115: Multi-tenant SSO Session Invalidation</strong> directly to production Jira (<code>nforceonehr.atlassian.net</code>).
          </p>
          <div style="background: var(--bg-subtle); border: 1px solid var(--border-default); border-radius: 8px; padding: 12px 14px; font-size: 12.5px; color: var(--text-secondary); display: flex; gap: 10px; align-items: flex-start;">
            <span style="color: var(--accent-primary); font-size: 16px;">🛡️</span>
            <div>
              <strong>Safeguard Active:</strong> Jira tickets will be labeled <code>pm-agent-verified</code> with full Gherkin criteria and link to the source QA spreadsheet.
            </div>
          </div>
          `,
          () => {
            showToast("Successfully pushed ONEHR-115 to Jira!", "success");
            const badge = document.getElementById("draft-status-badge");
            if (badge) {
              badge.textContent = "Pushed to Jira (PROJ-204)";
              badge.className = "status-pill pass";
            }
            approveBtn.textContent = "✓ Pushed to Jira";
            approveBtn.classList.remove("btn-primary");
            approveBtn.classList.add("btn-secondary");
            approveBtn.disabled = true;
          }
        );
      });
    }
  }

  // --- Feedback Actions ---
  function setupFeedbackActions() {
    window.convertFeedbackToTicket = function (id) {
      showToast(`Feedback ${id} converted to draft user story!`, "success");
      const badge = document.querySelector(`[data-feedback-id="${id}"] .fb-converted-badge`);
      if (badge) badge.style.display = "inline-flex";
    };
  }

  // --- Modal Helpers ---
  function openModal(title, contentHtml, onConfirm) {
    if (!el.modalBackdrop) return;
    el.modalTitle.textContent = title;
    el.modalBody.innerHTML = contentHtml;

    el.modalConfirmBtn.onclick = () => {
      if (onConfirm) onConfirm();
      closeModal();
    };

    el.modalCancelBtn.onclick = closeModal;
    el.modalCloseBtn.onclick = closeModal;
    el.modalBackdrop.classList.add("open");
  }

  function closeModal() {
    if (el.modalBackdrop) el.modalBackdrop.classList.remove("open");
  }

  // --- Command Palette ---
  function setupCommandPalette() {
    const openPalette = () => {
      if (el.cmdPalette) {
        el.cmdPalette.classList.add("open");
        el.cmdInput.value = "";
        el.cmdInput.focus();
        renderCmdResults("");
      }
    };

    const closePalette = () => {
      if (el.cmdPalette) el.cmdPalette.classList.remove("open");
    };

    if (el.searchTrigger) el.searchTrigger.addEventListener("click", openPalette);

    window.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        openPalette();
      }
      if (e.key === "Escape") {
        closePalette();
        closeModal();
      }
    });

    if (el.cmdPalette) {
      el.cmdPalette.addEventListener("click", (e) => {
        if (e.target === el.cmdPalette) closePalette();
      });
    }

    if (el.cmdInput) {
      el.cmdInput.addEventListener("input", (e) => {
        renderCmdResults(e.target.value.toLowerCase());
      });
    }
  }

  const COMMAND_ITEMS = [
    { label: "Go to Home Dashboard", category: "Navigation", icon: "⚡", action: () => navigateTo("home") },
    { label: "Open AI Agent Chat", category: "Navigation", icon: "✦", action: () => navigateTo("agent") },
    { label: "View QA & Release Dashboard", category: "Navigation", icon: "📊", action: () => navigateTo("projects") },
    { label: "Inspect Drafts & Gherkin Specs", category: "Navigation", icon: "⚖️", action: () => navigateTo("drafts") },
    { label: "Open Studio & PRD Generator", category: "Navigation", icon: "✍️", action: () => navigateTo("studio") },
    { label: "Customer Feedback Inbox", category: "Navigation", icon: "💬", action: () => navigateTo("feedback") },
    { label: "Sprint Health & Risk Radar", category: "Navigation", icon: "🛡️", action: () => navigateTo("health") },
    { label: "Activity & Audit Trail", category: "Navigation", icon: "⏱️", action: () => navigateTo("activity") },
    { label: "Integrations & Connections", category: "Navigation", icon: "🔌", action: () => navigateTo("connections") },
    { label: "Ticket ONEHR-115 (OAuth2 Session Demotion)", category: "Tickets", icon: "🎫", action: () => window.inspectTicket("ONEHR-115") },
    { label: "Ticket ONEHR-336 (Webhook Rate-Limiter)", category: "Tickets", icon: "🎫", action: () => window.inspectTicket("ONEHR-336") },
    { label: "Toggle Dark / Light Theme", category: "System", icon: "🌓", action: () => toggleTheme() }
  ];

  function renderCmdResults(query) {
    if (!el.cmdResults) return;
    const filtered = COMMAND_ITEMS.filter((item) => item.label.toLowerCase().includes(query) || item.category.toLowerCase().includes(query));

    el.cmdResults.innerHTML = filtered
      .map(
        (item, idx) => `
      <div class="cmd-item ${idx === 0 ? 'selected' : ''}" onclick="window.runCommand(${COMMAND_ITEMS.indexOf(item)})">
        <span class="cmd-item-icon">${item.icon}</span>
        <span>${item.label}</span>
        <span class="cmd-item-badge">${item.category}</span>
      </div>
    `
      )
      .join("");
  }

  window.runCommand = function (index) {
    if (COMMAND_ITEMS[index]) {
      COMMAND_ITEMS[index].action();
      if (el.cmdPalette) el.cmdPalette.classList.remove("open");
    }
  };

  // --- Theme Toggle ---
  function setupThemeToggle() {
    if (el.themeToggle) {
      el.themeToggle.addEventListener("click", toggleTheme);
    }
  }

  function toggleTheme() {
    state.theme = state.theme === "dark" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", state.theme);
    showToast(`Switched to ${state.theme} mode`, "info");
  }

  // --- Global Window Helpers for In-App Clicks ---
  window.navigateToTab = (tab) => navigateTo(tab);

  window.inspectTicket = (ticketKey) => {
    openModal(
      `Jira Ticket: ${ticketKey}`,
      `
      <div style="font-size: 13.5px; line-height: 1.6; color: var(--text-primary);">
        <div style="display: flex; gap: 8px; margin-bottom: 12px; align-items: center;">
          <span class="status-pill blocked">P0 Blocker</span>
          <span style="color: var(--text-tertiary); font-size: 12px;">Component: Auth / SSO</span>
          <span style="color: var(--text-tertiary); font-size: 12px;">Assignee: @lead-architect</span>
        </div>
        <p><strong>Title:</strong> OAuth2 Refresh Token Invalidation on IAM Demotion</p>
        <p style="margin-top: 8px; color: var(--text-secondary);">
          Reported by automated QA Pipeline from <code>qa-sheet-sprint42.xlsx</code> line 14. Linked GitHub PR: <a href="#" style="color: var(--accent-primary);">#142</a>.
        </p>
        <div style="margin-top: 14px; background: var(--bg-subtle); padding: 12px; border-radius: 8px; font-family: var(--font-mono); font-size: 11.5px;">
          status: IN_PROGRESS<br/>
          regression: true<br/>
          verified_by: PM Agent AI
        </div>
      </div>
      `,
      () => showToast(`Opened ${ticketKey} in Jira`, "success")
    );
  };

  window.inspectTestLog = (testId) => {
    openModal(
      `Test Execution Logs: ${testId}`,
      `
      <div style="background: var(--bg-canvas); color: #4ade80; font-family: var(--font-mono); font-size: 11.5px; padding: 14px; border-radius: 8px; line-height: 1.6; max-height: 240px; overflow-y: auto;">
        [00:00:01] RUNNING suite: Auth/SSO Regression<br/>
        [00:00:02] POST /api/v2/auth/token ... 200 OK (38ms)<br/>
        [00:00:03] PATCH /api/v2/users/alex/role { role: "MEMBER" } ... 200 OK (42ms)<br/>
        [00:00:04] GET /api/v2/payroll/reports ... EXPECTED 401, RECEIVED 200 (FAIL)<br/>
        [00:00:05] ASSERTION_ERROR: token not invalidated within 0ms SLA
      </div>
      `
    );
  };

  window.copyMarkdown = (text) => {
    navigator.clipboard?.writeText(text);
    showToast("Markdown copied to clipboard!", "success");
  };

  window.testConnection = (name) => {
    showToast(`Testing latency to ${name}...`, "info");
    setTimeout(() => {
      showToast(`${name} connected! Latency: 118ms · Healthy`, "success");
    }, 600);
  };

  function renderAllPanels() {
    // Initial renders if needed
  }

  // Self-start on DOM ready
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
