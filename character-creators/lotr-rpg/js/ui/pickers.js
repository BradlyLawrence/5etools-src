/** Minimal DOM helpers (shared pattern with dnd-2024). */

export function el (tag, attrs = {}, children = []) {
	const node = document.createElement(tag);
	for (const [k, v] of Object.entries(attrs)) {
		if (k === "class") node.className = v;
		else if (k === "html") node.innerHTML = v;
		else if (k === "text") node.textContent = v;
		else if (k.startsWith("on") && typeof v === "function") node.addEventListener(k.slice(2).toLowerCase(), v);
		else if (v === false || v == null) continue;
		else if (v === true) node.setAttribute(k, "");
		else node.setAttribute(k, String(v));
	}
	for (const child of [].concat(children)) {
		if (child == null || child === false) continue;
		node.append(child.nodeType ? child : document.createTextNode(String(child)));
	}
	return node;
}

export function clear (node) {
	while (node.firstChild) node.removeChild(node.firstChild);
	return node;
}

export function multiCheck (items, {value, label, selected = [], onChange, max} = {}) {
	const wrap = el("div", {class: "cc-checklist"});
	const selectedSet = new Set(selected.map(String));
	const render = () => {
		clear(wrap);
		for (const item of items) {
			const v = String(value ? value(item) : item);
			const lab = label ? label(item) : v;
			const id = `chk-${v.replace(/\W+/g, "_")}`;
			const labelEl = el("label", {class: "cc-check", for: id});
			const input = el("input", {type: "checkbox", id, value: v});
			input.checked = selectedSet.has(v);
			input.addEventListener("change", () => {
				if (input.checked) {
					if (max != null && selectedSet.size >= max) {
						input.checked = false;
						return;
					}
					selectedSet.add(v);
				} else selectedSet.delete(v);
				onChange?.([...selectedSet]);
			});
			labelEl.append(input, el("span", {text: lab}));
			wrap.append(labelEl);
		}
	};
	render();
	return wrap;
}
