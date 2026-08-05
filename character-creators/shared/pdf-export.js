/**
 * Export a DOM node to a multi-page PDF using html2canvas + jsPDF.
 * Supports logical page breaking via `.cc-pdf-page` sub-elements.
 */

/**
 * @param {HTMLElement} element
 * @param {string} filename
 * @param {{marginMm?: number, scale?: number}} [opts]
 */
export async function exportElementToPdf (element, filename, {marginMm = 8, scale = 2} = {}) {
	const html2canvas = window.html2canvas;
	const jspdfNs = window.jspdf;
	if (!html2canvas || !jspdfNs?.jsPDF) {
		throw new Error("PDF libraries not loaded (html2canvas / jsPDF).");
	}

	const {jsPDF} = jspdfNs;
	const pdf = new jsPDF({orientation: "portrait", unit: "mm", format: "letter"});
	const pageWidth = pdf.internal.pageSize.getWidth();
	const pageHeight = pdf.internal.pageSize.getHeight();
	const contentWidth = pageWidth - marginMm * 2;
	const contentHeight = pageHeight - marginMm * 2;

	const pageElements = Array.from(element.querySelectorAll(".cc-pdf-page"));

	if (pageElements.length > 0) {
		// Render discrete logical pages without splitting elements mid-card
		for (let i = 0; i < pageElements.length; i++) {
			const pageEl = pageElements[i];
			const canvas = await html2canvas(pageEl, {
				scale,
				useCORS: true,
				backgroundColor: "#ffffff",
				logging: false,
				windowWidth: pageEl.scrollWidth || 816,
			});

			const imgWidth = contentWidth;
			const imgHeight = (canvas.height * imgWidth) / canvas.width;
			const renderHeight = Math.min(imgHeight, contentHeight);

			const imgData = canvas.toDataURL("image/jpeg", 0.95);
			if (i > 0) pdf.addPage();
			pdf.addImage(imgData, "JPEG", marginMm, marginMm, imgWidth, renderHeight);
		}
	} else {
		// Fallback slice rendering for un-paged elements
		const canvas = await html2canvas(element, {
			scale,
			useCORS: true,
			backgroundColor: "#ffffff",
			logging: false,
			windowWidth: element.scrollWidth,
		});

		const imgWidth = contentWidth;
		const pageCanvas = document.createElement("canvas");
		const pageCtx = pageCanvas.getContext("2d");
		const pxPerMm = canvas.width / imgWidth;
		const pageHeightPx = contentHeight * pxPerMm;

		let y = 0;
		let pageIndex = 0;
		while (y < canvas.height) {
			const sliceHeight = Math.min(pageHeightPx, canvas.height - y);
			pageCanvas.width = canvas.width;
			pageCanvas.height = sliceHeight;
			pageCtx.fillStyle = "#ffffff";
			pageCtx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);
			pageCtx.drawImage(canvas, 0, y, canvas.width, sliceHeight, 0, 0, canvas.width, sliceHeight);

			const imgData = pageCanvas.toDataURL("image/jpeg", 0.92);
			const sliceMm = sliceHeight / pxPerMm;
			if (pageIndex > 0) pdf.addPage();
			pdf.addImage(imgData, "JPEG", marginMm, marginMm, imgWidth, sliceMm);
			y += sliceHeight;
			pageIndex++;
		}
	}

	const safeName = (filename || "character").replace(/[^\w.\- ]+/g, "_");
	pdf.save(safeName.endsWith(".pdf") ? safeName : `${safeName}.pdf`);
}
