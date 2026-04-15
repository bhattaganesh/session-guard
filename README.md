<div align="center">
  <img src="icons/icon128.png" alt="Session Guard Logo" width="128" />
  <h1>Session Guard</h1>
  <p><strong>A privacy-focused Chrome Extension that automatically secures your personal accounts when you close the browser.</strong></p>
</div>

---

## 🛡️ Privacy First

Session Guard enhances your privacy by automatically signing you out of personal accounts on protected services (like Gmail, GitHub, Outlook, etc.) whenever you close Chrome.

**Your open tabs are preserved for your next session, so your work is never lost.** Protected accounts simply require a re-login, ensuring that no one can access your sensitive data left active in the browser.

## ✨ Features

* **Automatic Auto-Logout:** Safely and reliably signs you out of selected services precisely when the browser window closes.
* **Protected Services Library:** Effortlessly manage which popular services (Google, GitHub, Microsoft, Slack, etc.) you want to protect with one click.
* **Custom Services:** Add and protect your own domains and custom URLs that aren't listed in the default library.
* **Tab Preservation:** Your session tabs remain totally untouched and load normally on your next launch, they are just safely logged out.
* **Modern MV3 Architecture:** Built securely using the latest Manifest V3 APIs and a bulletproof two-phase logout worker strategy.

## 🚀 Installation (Developer Mode)

*Current installation is manual while the extension is being prepared for the Chrome Web Store.*

1. **Download:** Clone this repository or download the source code as a ZIP.
2. **Unpack:** If downloaded as a zip, extract the folder to a convenient location on your machine.
3. **Open Extensions:** Open Google Chrome and navigate to `chrome://extensions`.
4. **Developer Mode:** Toggle on **Developer mode** in the top right corner.
5. **Load Unpacked:** Click the **Load unpacked** button in the top left.
6. **Select Folder:** Choose the extracted `session-guard` folder containing the extension files (`manifest.json`).

*You're all set! Pin the SG icon to your toolbar and click it to configure your protected services.*

## 📄 License

This project is licensed under the **GNU General Public License v3.0** - see the `LICENSE` file for details.
