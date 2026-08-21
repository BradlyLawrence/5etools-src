/** Save / load JSON character files. */

export const FILE_TYPE_2024 = "5etools-char-2024";

/**
 * @param {string} filename
 * @param {object} data
 */
export function downloadJson (filename, data) {
	const blob = new Blob([JSON.stringify(data, null, "\t")], {type: "application/json"});
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = filename.endsWith(".json") ? filename : `${filename}.json`;
	document.body.appendChild(a);
	a.click();
	a.remove();
	URL.revokeObjectURL(url);
}

/**
 * Open a file picker and parse JSON.
 * @param {{expectedFileType?: string|string[], allowAnyValidJson?: boolean}} [opts]
 * @returns {Promise<object|null>}
 */
export function loadJsonFile ({expectedFileType = null, allowAnyValidJson = true} = {}) {
	return new Promise((resolve) => {
		const input = document.createElement("input");
		input.type = "file";
		input.accept = ".json,application/json";
		input.style.position = "fixed";
		input.style.top = "-1000px";
		input.style.left = "-1000px";
		input.style.opacity = "0";
		input.style.pointerEvents = "none";
		document.body.appendChild(input);

		let isHandled = false;
		const cleanup = () => {
			if (!isHandled) {
				isHandled = true;
				try { if (input.parentNode) input.remove(); } catch {}
			}
		};

		input.addEventListener("change", async () => {
			const file = input.files?.[0];
			cleanup();
			if (!file) {
				resolve(null);
				return;
			}
			try {
				const text = await file.text();
				const json = JSON.parse(text);
				if (expectedFileType) {
					const allowedTypes = Array.isArray(expectedFileType) ? expectedFileType : [expectedFileType];
					if (json.fileType && !allowedTypes.includes(json.fileType)) {
						if (!allowAnyValidJson) {
							alert(`Unexpected file type "${json.fileType}". Expected "${allowedTypes.join(" or ")}".`);
							resolve(null);
							return;
						}
					}
				}
				resolve(json);
			} catch (e) {
				alert(`Failed to load JSON: ${e.message}`);
				resolve(null);
			}
		});

		input.addEventListener("cancel", () => {
			cleanup();
			resolve(null);
		});

		// Fallback for browsers that don't emit cancel
		window.addEventListener("focus", () => {
			setTimeout(() => {
				if (!isHandled && (!input.files || input.files.length === 0)) {
					cleanup();
					resolve(null);
				}
			}, 1000);
		}, {once: true});

		input.click();
	});
}

export function storageGet (key) {
	try {
		const raw = localStorage.getItem(key);
		return raw ? JSON.parse(raw) : null;
	} catch {
		return null;
	}
}

export function storageSet (key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
	} catch (e) {
		console.warn("localStorage write failed", e);
	}
}

export function storageRemove (key) {
	try {
		localStorage.removeItem(key);
	} catch { /* ignore */ }
}
