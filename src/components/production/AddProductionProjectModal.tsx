"use client";

import { useState, useTransition } from "react";
import { createManualProductionProject } from "@/app/(workspace)/pipeline/production/actions";
import { Modal, ModalButton } from "@/components/ui/Modal";
import { inputClass, selectTriggerClass } from "@/lib/form-styles";
import { PARTIES } from "@/data/workflow";
import type { ProductionLeadParty } from "@/lib/production/health";
import { PRIORITY_OPTIONS } from "@/lib/validation-data";

const LEAD_PARTIES: ProductionLeadParty[] = ["adsomnia", "btr", "hn"];

type Props = {
  open: boolean;
  onClose: () => void;
  onCreated: (id: number) => void;
};

export function AddProductionProjectModal({ open, onClose, onCreated }: Props) {
  const [title, setTitle] = useState("");
  const [priority, setPriority] = useState("");
  const [leadParty, setLeadParty] = useState("");
  const [jiraUrl, setJiraUrl] = useState("");
  const [driveUrl, setDriveUrl] = useState("");
  const [slackChannel, setSlackChannel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startSubmit] = useTransition();

  function reset() {
    setTitle("");
    setPriority("");
    setLeadParty("");
    setJiraUrl("");
    setDriveUrl("");
    setSlackChannel("");
    setError(null);
  }

  function handleClose() {
    if (pending) return;
    reset();
    onClose();
  }

  function handleSubmit() {
    setError(null);
    startSubmit(async () => {
      const result = await createManualProductionProject({
        title,
        consensusPriority: priority,
        leadParty,
        jiraUrl,
        driveUrl,
        slackChannel,
      });
      if (result.error) {
        setError(result.error);
        return;
      }
      if (result.id != null) {
        reset();
        onCreated(result.id);
      }
    });
  }

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add production project"
      actions={
        <>
          <ModalButton onClick={handleClose} disabled={pending}>
            Cancel
          </ModalButton>
          <ModalButton
            variant="primary"
            onClick={handleSubmit}
            disabled={pending}
          >
            {pending ? "Adding…" : "Add project"}
          </ModalButton>
        </>
      }
    >
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-muted">
          Lands directly in Production. Link an existing Jira space for the
          chosen lead party so epics can load as usual.
        </p>

        <label className="block">
          <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Title
          </span>
          <input
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            maxLength={160}
            placeholder="Project title"
            className={inputClass}
          />
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Consensus priority
            </span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value)}
              className={selectTriggerClass}
            >
              <option value="">Select…</option>
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="block">
            <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
              Lead production party
            </span>
            <select
              value={leadParty}
              onChange={(event) => setLeadParty(event.target.value)}
              className={selectTriggerClass}
            >
              <option value="">Select…</option>
              {LEAD_PARTIES.map((id) => {
                const party = PARTIES.find((item) => item.id === id)!;
                return (
                  <option key={id} value={id}>
                    {party.label}
                  </option>
                );
              })}
            </select>
          </label>
        </div>

        <label className="block">
          <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Jira space URL
          </span>
          <input
            type="url"
            value={jiraUrl}
            onChange={(event) => setJiraUrl(event.target.value)}
            placeholder="https://….atlassian.net/jira/software/projects/…"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Drive URL <span className="text-muted/50">optional</span>
          </span>
          <input
            type="url"
            value={driveUrl}
            onChange={(event) => setDriveUrl(event.target.value)}
            placeholder="https://drive.google.com/…"
            className={inputClass}
          />
        </label>

        <label className="block">
          <span className="mb-1.5 block font-display text-[10px] font-bold uppercase tracking-wide text-muted">
            Slack channel <span className="text-muted/50">optional</span>
          </span>
          <input
            type="text"
            value={slackChannel}
            onChange={(event) => setSlackChannel(event.target.value)}
            placeholder="project-channel"
            className={inputClass}
          />
        </label>

        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    </Modal>
  );
}
