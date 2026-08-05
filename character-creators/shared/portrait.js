/**
 * Shared Character Portrait picker modal dialog for selecting a local file or entering an image URL.
 * Converts local image file to base64 Data URL so it persists inside saved JSON.
 */
export function openPortraitModal ({portraitUrl, onSave, el}) {
	const backdrop = el("div", {class: "cc-modal-backdrop"});
	const modal = el("div", {class: "cc-modal cc-portrait-modal", style: "max-width: 440px;"});

	modal.append(el("h2", {text: "Character Portrait"}));
	modal.append(el("p", {class: "cc-muted", text: "Select a local image file from your computer or paste an image URL."}));

	let currentVal = portraitUrl || "";

	// Preview box
	const prevWrap = el("div", {style: "display: flex; justify-content: center; margin: 1rem 0;"});
	const frame = el("div", {class: "cc-portrait-frame", style: "width: 110px; height: 110px;"});
	const renderPreview = () => {
		frame.innerHTML = "";
		if (currentVal) {
			const img = el("img", {class: "cc-portrait-img", src: currentVal, alt: "Portrait preview"});
			img.onerror = () => {
				frame.innerHTML = `<span class="cc-portrait-placeholder" style="font-size: 1rem; color: var(--cc-danger);">Invalid Image</span>`;
			};
			frame.append(img);
		} else {
			frame.append(el("span", {class: "cc-portrait-placeholder", style: "font-size: 2.8rem;", text: "👤"}));
		}
	};
	renderPreview();
	prevWrap.append(frame);
	modal.append(prevWrap);

	// File Upload input
	const fileBox = el("div", {class: "cc-form-group", style: "margin-bottom: 1rem;"});
	fileBox.append(el("label", {class: "cc-field-label", text: "Upload Image File:"}));
	const fileBtn = el("button", {
		type: "button",
		class: "cc-btn cc-btn-primary",
		style: "width: 100%;",
		text: "📁 Choose Local Image File",
		onClick: () => fileInput.click(),
	});
	const fileInput = el("input", {
		type: "file",
		accept: "image/*",
		style: "display: none;",
		onChange: (e) => {
			const file = e.target.files?.[0];
			if (!file) return;
			const reader = new FileReader();
			reader.onload = (evt) => {
				currentVal = evt.target.result;
				urlInput.value = "";
				renderPreview();
			};
			reader.readAsDataURL(file);
		},
	});
	fileBox.append(fileBtn, fileInput);
	modal.append(fileBox);

	// URL input
	const urlBox = el("div", {class: "cc-form-group"});
	urlBox.append(el("label", {class: "cc-field-label", text: "Or Image Web URL:"}));
	const urlInput = el("input", {
		class: "cc-input",
		type: "url",
		placeholder: "https://example.com/character.png",
		value: currentVal.startsWith("data:") ? "" : currentVal,
		onInput: (e) => {
			currentVal = e.target.value.trim();
			renderPreview();
		},
	});
	urlBox.append(urlInput);
	modal.append(urlBox);

	// Footer controls
	const footer = el("div", {class: "cc-wizard-footer", style: "margin-top: 1.25rem;"});
	const clearBtn = el("button", {
		type: "button",
		class: "cc-btn cc-btn-danger",
		text: "Remove Portrait",
		onClick: () => {
			currentVal = "";
			urlInput.value = "";
			renderPreview();
		},
	});
	const saveBtn = el("button", {
		type: "button",
		class: "cc-btn cc-btn-primary",
		text: "Save Portrait",
		onClick: () => {
			onSave?.(currentVal);
			backdrop.remove();
		},
	});

	footer.append(clearBtn, saveBtn);
	modal.append(footer);

	backdrop.append(modal);
	backdrop.addEventListener("click", (e) => {
		if (e.target === backdrop) backdrop.remove();
	});
	document.body.append(backdrop);
}
