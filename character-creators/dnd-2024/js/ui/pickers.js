/** Small DOM helpers for pickers. */

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

export function optionList (items, {value, label, selected} = {}) {
	const sel = el("select", {class: "cc-select"});
	sel.append(el("option", {value: "", text: "— Select —"}));
	for (const item of items) {
		const v = value ? value(item) : item;
		const lab = label ? label(item) : String(item);
		const opt = el("option", {value: v, text: lab});
		if (selected != null && String(selected) === String(v)) opt.selected = true;
		sel.append(opt);
	}
	return sel;
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
	wrap.getSelected = () => [...selectedSet];
	return wrap;
}

export function radioCards (items, {value, label, detail, selected, onChange, name = "card"} = {}) {
	const wrap = el("div", {class: "cc-radio-cards"});
	for (const item of items) {
		const v = String(value ? value(item) : item);
		const lab = label ? label(item) : v;
		const det = detail ? detail(item) : "";
		const id = `${name}-${v.replace(/\W+/g, "_")}`;
		const card = el("label", {class: "cc-radio-card", for: id});
		const input = el("input", {type: "radio", name, id, value: v});
		if (selected != null && String(selected) === v) input.checked = true;
		input.addEventListener("change", () => {
			if (input.checked) onChange?.(v, item);
		});
		card.append(
			input,
			el("div", {class: "cc-radio-card-body"}, [
				el("div", {class: "cc-radio-card-title", text: lab}),
				det ? el("div", {class: "cc-radio-card-detail", text: det}) : null,
			]),
		);
		wrap.append(card);
	}
	return wrap;
}
