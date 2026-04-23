# LinkedIn Reposted Marker 🔎

**LinkedIn Reposted Marker** is a Chrome and Edge extension that helps you spot **reposted LinkedIn job listings** at a glance, so you can scan job results faster and waste less time opening recycled posts.

---

## ✨ At a Glance

- 🎯 Highlights reposted jobs in the **left-side jobs list**
- 📄 Highlights reposted jobs in the **right-side detail panel**
- ⚡ Prefetches unresolved jobs in the background
- 🎛️ Lets you tune behavior from the popup
- 🐞 Exports debug logs as JSON when troubleshooting is needed

---

## 📦 Installation

### Option 1: Download ZIP from GitHub
1. Download this repository as a ZIP file from GitHub  
   (`Code` → `Download ZIP`)
2. Unzip the downloaded file
3. Open `chrome://extensions` or `edge://extensions`
4. Enable **Developer Mode**
5. Click **Load unpacked**
6. Select the extracted `reposted-marker/extension` directory
7. If you update the source later, reload the extension in the browser

### Option 2: Clone with Git
If you cloned the repository with Git, you can skip the ZIP and unzip steps and go straight to loading the unpacked extension.

---

## 🚀 Quick Start

1. Open the LinkedIn Jobs search results page:  
   `https://www.linkedin.com/jobs/search/`
2. Pin the extension if needed, then click the toolbar icon to open the control menu
3. Keep **Extension Enabled** turned on so scanning and highlighting can run
4. Keep **Background Prefetch** turned on if you want unresolved jobs checked before opening them

---

## 🧭 Daily Usage Tips

- Adjust **Prefetch Window**, **Prefetch Concurrency**, and **Cache TTL** depending on how aggressive you want prefetching to be
- Turn on **Debug Mode** only when you are reproducing or diagnosing issues
- Use **Download Debug Log** to export the current debug log as JSON
- If LinkedIn updates the page dynamically, give the extension a moment to rescan and reapply highlights

---

## ⚠️ Important Notes

- ✅ Supported context: `https://www.linkedin.com/jobs/search/`
- ❌ Not supported: pages under a `search-results` path or context
- If you are outside the supported search URL context, scanning and highlighting may not work as expected

---

## 🎛️ Control Menu

The popup currently supports:

- enabling or disabling the extension
- enabling or disabling background prefetch
- toggling left-list highlighting
- toggling detail-panel highlighting
- adjusting prefetch window size
- adjusting prefetch concurrency
- adjusting cache TTL
- toggling debug mode
- downloading debug logs
- clearing debug logs

---

## 🛠️ Why Use It?

Job hunting already involves enough repetitive clicking, false hope, and questionable corporate wording. This extension helps by surfacing reposted jobs earlier, so you can focus on fresher listings instead of reopening the same recycled posts over and over.

---

## 📚 More Docs

- Architecture and technical details: [Architecture.md](Architecture.md)
