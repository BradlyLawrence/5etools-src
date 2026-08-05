/**
 * Shared modal dialog component to replace native browser alert(), confirm(), and prompt() popups.
 */

export function showModalDialog ({
	title = "Notice",
	message = "",
	confirmText = "OK",
	cancelText = null,
	onConfirm = null,
	onCancel = null,
	isDanger = false,
	el = null,
}) {
	const domEl = el || ((tag, attrs = {}, children = []) => {
		const elem = document.createElement(tag);
		for (const [k, v] of Object.entries(attrs)) {
			if (k === "class") elem.className = v;
			else if (k === "text") elem.textContent = v;
			else if (k === "html") elem.innerHTML = v;
			else if (k.startsWith("on") && typeof v === "function") {
				elem.addEventListener(k.slice(2).toLowerCase(), v);
			} else elem.setAttribute(k, v);
		}
		if (Array.isArray(children)) children.forEach(c => c && elem.append(c));
		else if (children) elem.append(children);
		return elem;
	});

	const backdrop = domEl("div", {class: "cc-modal-backdrop"});
	const modal = domEl("div", {class: "cc-modal", style: "max-width: 460px; text-align: left;"});

	if (title) modal.append(domEl("h2", {text: title, style: "margin-top: 0; font-size: 1.25rem;"}));

	if (message) {
		const formattedMsg = String(message).replace(/\n/g, "<br>");
		modal.append(domEl("p", {html: formattedMsg, style: "margin: 1rem 0 1.25rem; line-height: 1.5; color: var(--cc-fg-muted, #d0d7de);"}));
	}

	const footer = domEl("div", {class: "cc-wizard-footer", style: "display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;"});

	if (cancelText) {
		footer.append(domEl("button", {
			type: "button",
			class: "cc-btn",
			text: cancelText,
			onClick: () => {
				backdrop.remove();
				onCancel?.();
			},
		}));
	}

	footer.append(domEl("button", {
		type: "button",
		class: `cc-btn ${isDanger ? "cc-btn-danger" : "cc-btn-primary"}`,
		text: confirmText,
		onClick: () => {
			backdrop.remove();
			onConfirm?.();
		},
	}));

	modal.append(footer);
	backdrop.append(modal);

	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) {
			backdrop.remove();
			onCancel?.();
		}
	});

	document.body.append(backdrop);
}

export function showAlertModal (title, message, el) {
	return new Promise((resolve) => {
		showModalDialog({
			title,
			message,
			confirmText: "OK",
			onConfirm: () => resolve(true),
			el,
		});
	});
}

export function showConfirmModal (title, message, {confirmText = "Confirm", cancelText = "Cancel", isDanger = false, el} = {}) {
	return new Promise((resolve) => {
		showModalDialog({
			title,
			message,
			confirmText,
			cancelText,
			isDanger,
			onConfirm: () => resolve(true),
			onCancel: () => resolve(false),
			el,
		});
	});
}

export function showPromptModal (title, message, {defaultValue = "", placeholder = "", confirmText = "Save", cancelText = "Cancel", inputType = "text", el} = {}) {
	return new Promise((resolve) => {
		const domEl = el || ((tag, attrs = {}, children = []) => {
			const elem = document.createElement(tag);
			for (const [k, v] of Object.entries(attrs)) {
				if (k === "class") elem.className = v;
				else if (k === "text") elem.textContent = v;
				else if (k === "html") elem.innerHTML = v;
				else if (k.startsWith("on") && typeof v === "function") {
					elem.addEventListener(k.slice(2).toLowerCase(), v);
				} else elem.setAttribute(k, v);
			}
			if (Array.isArray(children)) children.forEach(c => c && elem.append(c));
			else if (children) elem.append(children);
			return elem;
		});

		const backdrop = domEl("div", {class: "cc-modal-backdrop"});
		const modal = domEl("div", {class: "cc-modal", style: "max-width: 440px; text-align: left;"});

		if (title) modal.append(domEl("h2", {text: title, style: "margin-top: 0; font-size: 1.25rem;"}));

		if (message) {
			const formattedMsg = String(message).replace(/\n/g, "<br>");
			modal.append(domEl("p", {html: formattedMsg, style: "margin: 0.75rem 0 0.5rem; line-height: 1.5; color: var(--cc-fg-muted, #d0d7de);"}));
		}

		const input = domEl("input", {
			class: "cc-input",
			type: inputType,
			value: String(defaultValue),
			placeholder,
			style: "width: 100%; margin: 0.5rem 0 1rem;",
		});

		modal.append(input);

		const footer = domEl("div", {class: "cc-wizard-footer", style: "display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 1rem;"});

		footer.append(domEl("button", {
			type: "button",
			class: "cc-btn",
			text: cancelText,
			onClick: () => {
				backdrop.remove();
				resolve(null);
			},
		}));

		footer.append(domEl("button", {
			type: "button",
			class: "cc-btn cc-btn-primary",
			text: confirmText,
			onClick: () => {
				const val = input.value;
				backdrop.remove();
				resolve(val);
			},
		}));

		modal.append(footer);
		backdrop.append(modal);

		input.addEventListener("keydown", (e) => {
			if (e.key === "Enter") {
				const val = input.value;
				backdrop.remove();
				resolve(val);
			}
		});

		backdrop.addEventListener("click", (e) => {
			if (e.target === backdrop) {
				backdrop.remove();
				resolve(null);
			}
		});

		document.body.append(backdrop);
		setTimeout(() => input.focus(), 50);
	});
}
