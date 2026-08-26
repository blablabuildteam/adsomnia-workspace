# Client instructions: Connect Slack to Adsomnia Workspace

These steps let Adsomnia Workspace create project Slack channels **in your Slack workspace** (instead of Adsomnia’s own).

You need:

- Access to **Adsomnia Workspace** (the web tool)
- A **Slack admin** (or someone allowed to install apps) for the first install
- Anyone who will **create** channels should complete the short “Connect my account” step once

---

## Part 1 — Install the app in your Slack (once per company)

Do this in your company’s Slack (the one where project channels should live).

1. Sign in to **Adsomnia Workspace** in your browser:  
   [https://adsomnia-workspace.vercel.app](https://adsomnia-workspace.vercel.app)
2. Open an initiative that is in **Project Setup**.
3. Open the task **Create Slack Channel**.
4. Click **Connect Slack** (or **Connect My Slack Account** / **Add workspace**).
5. Slack opens and asks you to allow **Adsomnia Workspace**.
6. Confirm you are installing into the **correct Slack workspace** (your company), then **Allow**.

You are done with the company install. The app is now available in your Slack.

**Tip:** If you belong to more than one Slack workspace, check the workspace name on the Slack permission screen before clicking Allow.

---

## Part 2 — Link your personal Slack user (once per person who creates channels)

Everyone who will click **Create Channel** in Adsomnia Workspace should do this once:

1. In Adsomnia Workspace → Project Setup → **Create Slack Channel**.
2. If you see **Connect My Slack Account**, click it.
3. On Slack’s screen, approve while logged in as **your own** day-to-day Slack user.
4. Return to Adsomnia Workspace — your account is now linked.

After that, when you create a channel you are invited automatically (important for **private** channels).

You do **not** need to repeat this for every project.

---

## Part 3 — Create a channel for a project

1. In Project Setup, open **Create Slack Channel**.
2. In the **Slack workspace** dropdown, choose **your company’s** workspace (not Adsomnia’s test workspace, if both appear).
3. Enter the channel name.
4. Choose **Public** or **Private**.
5. Click **Create Channel**.

| Type | Who can see it |
|------|----------------|
| **Public** | Anyone in your Slack can find and join it |
| **Private** | Only people who are invited (the creator is invited automatically) |

---

## What Slack will ask for

The app requests permission to:

- Create public and private channels  
- Invite people into those channels  
- Post a short message in the new channel  
- (Later) add bookmarks such as Drive or Jira links  

It does **not** need access to read your full message history for this setup.

If your company restricts app installs, a Slack **Workspace Owner / Admin** may need to approve **Adsomnia Workspace** first under Slack’s app management settings.

---

## Troubleshooting

| Problem | What to try |
|---------|-------------|
| Wrong workspace received the channel | In the dropdown, pick your company workspace; Connect again while that Slack workspace is selected on Slack’s approve screen |
| Created a private channel but can’t see it | Complete **Part 2** (link your Slack user), then create again — or ask someone already in the channel to invite you |
| “Connect Slack” errors after Allow | Confirm you used the production Adsomnia Workspace URL above, and that a Slack admin allowed the app |
| App install blocked | Ask a Slack admin to allow the Adsomnia Workspace app for your workspace |

---

## Summary

1. **Admin (once):** Connect Slack → install Adsomnia Workspace into **your** Slack.  
2. **Each channel creator (once):** Connect My Slack Account as themselves.  
3. **Per project:** Choose your workspace → Create Channel.

Questions: contact your Adsomnia project lead.
