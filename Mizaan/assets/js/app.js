(function () {
    "use strict";

    if (typeof AOS !== "undefined") {
        AOS.init({ duration: 500, once: true });
    }

    const form = document.querySelector("#itemForm");
    const productName = document.querySelector("#productName");
    const productAmount = document.querySelector("#productAmount");
    const productUnit = document.querySelector("#productUnit");
    const itemsContainer = document.querySelector("#itemsContainer");
    const itemsCount = document.querySelector("#itemsCount");
    const formTitle = document.querySelector("#formTitle");
    const submitButton = document.querySelector("#submitButton");
    const cancelEditButton = document.querySelector("#cancelEditButton");
    const pdfButton = document.querySelector("#pdfTest");
    const pdfButtonText = document.querySelector("#pdfButtonText");
    const clearAllButton = document.querySelector("#clearAllButton");
    const toastBox = document.querySelector("#toastBox");

    const STORAGE_KEY = "mizaan-items";
    const numberFormatter = new Intl.NumberFormat("fa-IR", {
        maximumFractionDigits: 3
    });

    let items = loadItems();
    let editIndex = null;

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function normalizeNumber(value) {
        return value
            .trim()
            .replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); })
            .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); })
            .replace(/[٬,،\s]/g, "")
            .replace(/[٫/]/g, ".");
    }

    function parseAmount(value) {
        const normalized = normalizeNumber(value);

        if (normalized === "") {
            return { error: "لطفاً مقدار را وارد کنید." };
        }

        if (!/^\d+(\.\d+)?$/.test(normalized)) {
            return { error: "مقدار باید یک عدد معتبر باشد." };
        }

        const number = Number(normalized);

        if (number <= 0) {
            return { error: "مقدار باید بیشتر از صفر باشد." };
        }

        return { value: number };
    }

    function formatNumber(value) {
        return numberFormatter.format(value);
    }

    function loadItems() {
        try {
            const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
            return Array.isArray(saved) ? saved : [];
        } catch (error) {
            return [];
        }
    }

    function saveItems() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
        } catch (error) {
            
        }
    }

    function showToast(message, isError) {
        const toast = document.createElement("div");

        toast.className = "toast-item" + (isError ? " is-error" : "");
        toast.textContent = message;
        toastBox.appendChild(toast);

        setTimeout(function () {
            toast.remove();
        }, 3200);
    }

    function getFeedback(input) {
        return input.parentElement.querySelector(".invalid-feedback");
    }

    function setError(input, message) {
        input.classList.add("is-invalid");
        getFeedback(input).textContent = message;
    }

    function clearError(input) {
        input.classList.remove("is-invalid");
        getFeedback(input).textContent = "";
    }

    function resetEditMode() {
        editIndex = null;
        form.reset();
        formTitle.textContent = "افزودن مورد جدید";
        submitButton.textContent = "افزودن";
        cancelEditButton.classList.add("d-none");
        clearError(productName);
        clearError(productAmount);
    }

    productName.addEventListener("input", function () {
        if (productName.value.trim() !== "") {
            clearError(productName);
        }
    });

    productAmount.addEventListener("input", function () {
        if (!parseAmount(productAmount.value).error) {
            clearError(productAmount);
        }
    });

    function renderItems() {
        itemsCount.textContent = formatNumber(items.length) + " مورد";
        pdfButton.disabled = items.length === 0;
        clearAllButton.disabled = items.length === 0;

        if (items.length === 0) {
            itemsContainer.innerHTML = `
                <div class="empty-state">
                    <i class="fa fa-basket-shopping" aria-hidden="true"></i>
                    <p>هنوز موردی اضافه نشده است. اولین مورد را از فرم بالا اضافه کنید.</p>
                </div>
            `;
            return;
        }

        itemsContainer.innerHTML = items.map(function (item, index) {
            return `
                <div class="item-box${index === editIndex ? " is-editing" : ""}">
                    <p class="item-name">${escapeHtml(item.name)}</p>

                    <div class="item-reading">
                        <strong>${formatNumber(item.amount)}</strong>
                        <span>${escapeHtml(item.unit)}</span>
                    </div>

                    <button
                        type="button"
                        class="icon-btn"
                        data-action="edit"
                        data-index="${index}"
                        aria-label="ویرایش ${escapeHtml(item.name)}"
                    >
                        <i class="fa fa-pen" aria-hidden="true"></i>
                    </button>

                    <button
                        type="button"
                        class="icon-btn is-danger"
                        data-action="delete"
                        data-index="${index}"
                        aria-label="حذف ${escapeHtml(item.name)}"
                    >
                        <i class="fa fa-trash" aria-hidden="true"></i>
                    </button>
                </div>
            `;
        }).join("");
    }

    itemsContainer.addEventListener("click", function (event) {
        const button = event.target.closest("[data-action]");

        if (!button) {
            return;
        }

        const index = Number(button.dataset.index);

        if (button.dataset.action === "delete") {
            deleteItem(index);
        } else {
            startEdit(index);
        }
    });

    function deleteItem(index) {
        items.splice(index, 1);

        if (editIndex === index) {
            resetEditMode();
        } else if (editIndex !== null && editIndex > index) {
            editIndex -= 1;
        }

        saveItems();
        renderItems();
    }

    function startEdit(index) {
        const item = items[index];

        editIndex = index;
        productName.value = item.name;
        productAmount.value = item.amount;
        productUnit.value = item.unit;

        clearError(productName);
        clearError(productAmount);

        formTitle.textContent = "ویرایش مورد";
        submitButton.textContent = "ذخیره تغییرات";
        cancelEditButton.classList.remove("d-none");

        renderItems();
        form.scrollIntoView({ behavior: "smooth", block: "center" });
        productName.focus({ preventScroll: true });
    }

    form.addEventListener("submit", function (event) {
        event.preventDefault();

        const name = productName.value.trim();
        const amountResult = parseAmount(productAmount.value);
        let isValid = true;

        if (name === "") {
            setError(productName, "لطفاً اسم محصول را وارد کنید.");
            isValid = false;
        } else {
            clearError(productName);
        }

        if (amountResult.error) {
            setError(productAmount, amountResult.error);
            isValid = false;
        } else {
            clearError(productAmount);
        }

        if (!isValid) {
            return;
        }

        const item = {
            name: name,
            amount: amountResult.value,
            unit: productUnit.value
        };

        if (editIndex === null) {
            items.push(item);
        } else {
            items[editIndex] = item;
        }

        saveItems();
        resetEditMode();
        renderItems();
        productName.focus();
    });

    cancelEditButton.addEventListener("click", function () {
        resetEditMode();
        renderItems();
    });

    clearAllButton.addEventListener("click", function () {
        if (items.length === 0) {
            return;
        }

        if (!window.confirm("همه‌ی موارد لیست حذف شوند؟")) {
            return;
        }

        items = [];
        saveItems();
        resetEditMode();
        renderItems();
    });

    function buildReport() {
        const report = document.createElement("div");
        const today = new Date().toLocaleDateString("fa-IR", {
            year: "numeric",
            month: "long",
            day: "numeric"
        });

        report.className = "pdf-report";

        report.innerHTML = `
            <div class="report-header">
                <div class="report-brand">
                    <div class="report-logo">م</div>
                    <div>
                        <h1>میزان</h1>
                        <p>لیست خرید</p>
                    </div>
                </div>

                <div class="report-meta">
                    <div>${today}</div>
                    <div>تعداد اقلام: ${formatNumber(items.length)}</div>
                </div>
            </div>

            <div class="items-list">
                ${items.map(function (item) {
                    return `
                        <div class="pdf-item-card">
                            <div class="pdf-check"></div>
                            <div class="pdf-item-name">${escapeHtml(item.name)}</div>
                            <div class="pdf-item-amount">
                                <strong>${formatNumber(item.amount)}</strong>
                                <span>${escapeHtml(item.unit)}</span>
                            </div>
                        </div>
                    `;
                }).join("")}
            </div>

            <div class="report-footer">ساخته‌شده با میزان</div>
        `;

        return report;
    }

    function addPageNumbers(pdf) {
        const total = pdf.internal.getNumberOfPages();
        const width = pdf.internal.pageSize.getWidth();
        const height = pdf.internal.pageSize.getHeight();

        pdf.setFontSize(9);
        pdf.setTextColor(140);

        for (let page = 1; page <= total; page++) {
            pdf.setPage(page);
            pdf.text(page + " / " + total, width / 2, height - 7, { align: "center" });
        }
    }

    function setPdfBusy(isBusy) {
        pdfButton.disabled = isBusy || items.length === 0;
        pdfButtonText.textContent = isBusy
            ? "در حال ساخت فایل..."
            : "ساخت فایل لیست خرید";
    }

    async function generateReport() {
        if (items.length === 0) {
            showToast("ابتدا حداقل یک مورد به لیست اضافه کنید.", true);
            return;
        }

        if (typeof html2pdf === "undefined") {
            showToast("کتابخانه‌ی ساخت PDF بارگذاری نشده است.", true);
            return;
        }

        setPdfBusy(true);

        const options = {
            margin: [12, 10, 18, 10],
            filename: "mizaan-report.pdf",
            image: { type: "jpeg", quality: 0.98 },
            html2canvas: {
                scale: 2,
                useCORS: true,
                backgroundColor: "#ffffff",
                scrollX: 0,
                scrollY: 0
            },
            jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
            pagebreak: {
                mode: ["css", "legacy"],
                avoid: [".pdf-item-card", ".report-header", ".report-footer"]
            }
        };

        try {
            if (document.fonts && document.fonts.ready) {
                await document.fonts.ready;
            }

            await html2pdf()
                .set(options)
                .from(buildReport())
                .toPdf()
                .get("pdf")
                .then(addPageNumbers)
                .save();

            showToast("فایل لیست خرید ساخته شد.");
        } catch (error) {
            console.error(error);
            showToast("ساخت فایل با خطا مواجه شد. دوباره تلاش کنید.", true);
        } finally {
            setPdfBusy(false);
        }
    }

    pdfButton.addEventListener("click", generateReport);
    renderItems();
})();