const DateHelper = {

    toEnglish(str) {

        return str
            .replace(/[۰-۹]/g, d => "۰۱۲۳۴۵۶۷۸۹".indexOf(d))
            .replace(/[٠-٩]/g, d => "٠١٢٣٤٥٦٧٨٩".indexOf(d));

    },

    toTime(dateString) {

        if (!dateString)
            return 0;

        dateString = this.toEnglish(dateString);

        const p = dateString.split("/");

        if (p.length !== 3)
            return 0;

        return new persianDate([
            Number(p[0]),
            Number(p[1]),
            Number(p[2])
        ]).toDate().getTime();

    },
    today() {

        const d = new persianDate();

        const year =
            this.toEnglish(d.format("YYYY"));

        const month =
            this.toEnglish(d.format("MM"));

        const day =
            this.toEnglish(d.format("DD"));

        return {

            date: `${year}/${month}/${day}`,

            year: Number(year),

            month: Number(month),

            day: Number(day),

            timestamp: d.toDate().getTime()

        };

    },

    parse(dateString) {

        if (!dateString)
            return null;

        dateString = this.toEnglish(dateString);

        const p = dateString.split("/");

        if (p.length !== 3)
            return null;

        return {

            date: dateString,

            year: Number(p[0]),

            month: Number(p[1]),

            day: Number(p[2]),

            timestamp: this.toTime(dateString)

        };

    }

};




const M = {
    p: value => Number(String(value).replace(/,/g, "")) || 0,

    f: value => {
        return M.p(value).toLocaleString("en-US");
    }
};

// --- Database Abstraction Layer ---
const DB = {
    get(table) {
        try { return JSON.parse(localStorage.getItem(table)) || []; }
        catch { return []; }
    },
    set(table, data) {
        localStorage.setItem(table, JSON.stringify(data));
    },
    getById(table, id) {
        return this.get(table).find(item => item.id === id);
    },
    insert(table, item) {
        const data = this.get(table);
        item.id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5); // Unique ID
        data.push(item);
        this.set(table, data);
        return item;
    },
    update(table, id, newData) {
        let data = this.get(table);
        const index = data.findIndex(item => item.id === id);
        if (index !== -1) {
            data[index] = { ...data[index], ...newData };
            this.set(table, data);
            return data[index];
        }
        return null;
    },
    delete(table, id) {
        let data = this.get(table);
        this.set(table, data.filter(item => item.id !== id));
    }
};



// --- Routing / UI Controller ---
const UI = {
    init() {
        // Set default date to today
        $("#inv-date").persianDatepicker({
            format: 'YYYY/MM/DD',
            initialValue: true,
            autoClose: true
        });

        $("#ch-due-date").persianDatepicker({
            format: 'YYYY/MM/DD',
            initialValue: true,
            autoClose: true
        });


        $("#exp-date").persianDatepicker({

            format: "YYYY/MM/DD",

            initialValue: true,

            autoClose: true

        });

        // Sidebar Navigation
        document.querySelectorAll('#sidebar nav ul li').forEach(li => {
            li.addEventListener('click', (e) => {
                document.querySelectorAll('#sidebar nav ul li').forEach(l => l.classList.remove('active'));
                document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
                li.classList.add('active');
                document.getElementById(`page-${li.dataset.page}`).classList.add('active');

                // Trigger page specific refresh
                if (li.dataset.page === 'dashboard') Dashboard.render();
                if (li.dataset.page === 'products') Products.render();
                if (li.dataset.page === 'customers') Customers.render();
                if (li.dataset.page === 'create-invoice') InvoiceForm.init();
                if (li.dataset.page === 'invoices') InvoicesList.render();
                if (li.dataset.page === 'workers') Workers.render();
                if (li.dataset.page === 'salaries') { Salaries.init(); Salaries.renderTable(); }
                if (li.dataset.page === 'checks') Checks.render();
                if (li.dataset.page === "expenses") Expenses.render();
                if (li.dataset.page === "profits") Profits.render();
                if (li.dataset.page === "reports") Reports.render();
            });
        });

        Dashboard.render();
    }
};

// --- Dashboard Module ---
const Dashboard = {
    render() {

        const products = DB.get("products");
        const customers = DB.get("customers");
        const invoices = DB.get("invoices");
        const expenses = DB.get("expenses");

        //---------------------------------
        // گزارش 30 روز اخیر
        //---------------------------------

        const today = DateHelper.today();

        const currentYear = today.year;
        const currentMonth = today.month;

        let salesMonth = 0;
        let costMonth = 0;
        let expenseMonth = 0;


        invoices.forEach(inv => {


            console.log(
                inv.year,
                inv.month,
                currentYear,
                currentMonth
            );

            if (

                inv.year == currentYear &&

                inv.month == currentMonth

            ) {
                console.log("MATCH");

                salesMonth += M.p(inv.finalTotal);

                costMonth += M.p(inv.cost);

            }

        });

        expenses.forEach(exp => {

            if (

                exp.year == currentYear &&

                exp.month == currentMonth

            ) {

                expenseMonth += M.p(exp.amount);

            }

        });

        const grossProfitMonth =
            salesMonth - costMonth;

        const netProfitMonth =
            grossProfitMonth - expenseMonth;

        //---------------------------------
        // بدهی ها
        //---------------------------------

        const customerDebts =
            customers
                .filter(c => (c.type || "customer") === "customer")
                .reduce((sum, c) => sum + M.p(c.balance), 0);

        const supplierDebts =
            customers
                .filter(c => c.type === "supplier")
                .reduce((sum, c) => sum + M.p(c.balance), 0);


        console.log("امروز:", currentYear, currentMonth);

        //---------------------------------
        // نمایش
        //---------------------------------

        const totalSales = invoices.reduce(
            (sum, inv) => sum + M.p(inv.finalTotal),
            0
        );

        document.getElementById("stat-products").textContent =
            products.length;

        document.getElementById("stat-customers").textContent =
            customers.length;

        document.getElementById("stat-sales").textContent =
            M.f(totalSales) + " تومان";

        document.getElementById("stat-sale-month").textContent =
            M.f(salesMonth) + " تومان";

        document.getElementById("stat-cost-month").textContent =
            M.f(costMonth) + " تومان";

        document.getElementById("stat-gross-month").textContent =
            M.f(grossProfitMonth) + " تومان";

        document.getElementById("stat-expense-month").textContent =
            M.f(expenseMonth) + " تومان";

        document.getElementById("stat-profit-month").textContent =
            M.f(netProfitMonth) + " تومان";
        document.getElementById("stat-customer-debts").textContent =
            M.f(customerDebts) + " تومان";

        document.getElementById("stat-supplier-debts").textContent =
            M.f(supplierDebts) + " تومان";

    }
};


const Purchases = {
    autoFillProduct() {

        const name =
            document.getElementById("purchase-product")
                .value
                .trim()
                .toLowerCase();

        const products =
            DB.get("products");

        const product =
            products.find(p =>
                p.name.trim().toLowerCase() === name
            );

        if (!product)
            return;

        document.getElementById("purchase-unit").value =
            product.unit;

        document.getElementById("purchase-price").value =
            M.p(product.costPrice);

        this.calculateTotal();

    },

    calculateTotal() {

        const count =
            M.p(
                document.getElementById("purchase-count").value
            );

        const price =
            M.p(
                document.getElementById("purchase-price").value
            );

        document.getElementById("purchase-total").value =
            M.f(count * price);

    },
};


const Reports = {

    //--------------------------------------------------
    // گزارش یک ماه
    //--------------------------------------------------

    getMonthlyReport(year, month) {

        const invoices = DB.get("invoices");
        const expenses = DB.get("expenses");

        const report = {

            year,
            month,

            sales: 0,

            cost: 0,

            grossProfit: 0,

            expenses: 0,

            netProfit: 0,

            invoiceCount: 0,

            expenseCount: 0

        };

        //-----------------------
        // فاکتورها
        //-----------------------



        invoices.forEach(inv => {

            if (

                Number(inv.year) === Number(year) &&

                Number(inv.month) === Number(month)

            ) {

                report.sales += M.p(inv.finalTotal);

                report.cost += M.p(inv.cost);

                report.invoiceCount++;

            }

        });



        //-----------------------
        // هزینه ها
        //-----------------------

        expenses.forEach(exp => {

            if (

                Number(exp.year) === Number(year) &&

                Number(exp.month) === Number(month)

            ) {

                report.expenses += M.p(exp.amount);

                report.expenseCount++;

            }

        });

        //-----------------------
        // محاسبه سود
        //-----------------------

        report.grossProfit =
            report.sales - report.cost;

        report.netProfit =
            report.grossProfit - report.expenses;

        return report;

    },

    //--------------------------------------------------
    // گزارش سالانه
    //--------------------------------------------------

    getYearlyReport(year) {

        const invoices = DB.get("invoices");

        const expenses = DB.get("expenses");

        const report = {

            year,

            sales: 0,

            cost: 0,

            grossProfit: 0,

            expenses: 0,

            netProfit: 0,

            invoiceCount: 0,

            expenseCount: 0

        };

        //--------------------
        // فاکتورها
        //--------------------

        invoices.forEach(inv => {

            if (

                Number(inv.year) === Number(year)

            ) {

                report.sales += M.p(inv.finalTotal);

                report.cost += M.p(inv.cost);

                report.invoiceCount++;

            }

        });

        //--------------------
        // هزینه ها
        //--------------------

        expenses.forEach(exp => {

            if (

                Number(exp.year) === Number(year)

            ) {

                report.expenses += M.p(exp.amount);

                report.expenseCount++;

            }

        });

        report.grossProfit =
            report.sales - report.cost;

        report.netProfit =
            report.grossProfit - report.expenses;

        return report;

    },


    showMonthlyReport() {

        const year =
            Number(
                document.getElementById("report-month-year").value
            );

        const month =
            Number(
                document.getElementById("report-month").value
            );

        const report =
            this.getMonthlyReport(year, month);

        const box =
            document.getElementById("monthly-report-result");

        box.innerHTML = `

<div class="card card-blue">
<h3>فروش</h3>
<p>${M.f(report.sales)} تومان</p>
</div>

<div class="card card-orange">
<h3>بهای تمام شده</h3>
<p>${M.f(report.cost)} تومان</p>
</div>

<div class="card card-red">
<h3>سود ناخالص</h3>
<p>${M.f(report.grossProfit)} تومان</p>
</div>

<div class="card card-red">
<h3>هزینه ها</h3>
<p>${M.f(report.expenses)} تومان</p>
</div>

<div class="card card-green">
<h3>سود خالص</h3>
<p>${M.f(report.netProfit)} تومان</p>
</div>

<div class="card">
<h3>تعداد فاکتور</h3>
<p>${report.invoiceCount}</p>
</div>

<div class="card">
<h3>تعداد هزینه</h3>
<p>${report.expenseCount}</p>
</div>

`;

    },

    getInvoicePaid(invoiceId) {

        const checks =
            DB.get("checks");

        let paid = 0;

        checks.forEach(ch => {

            if (

                ch.invoiceId === invoiceId &&

                ch.status === "وصول شده"

            ) {

                paid += M.p(ch.amount);

            }

        });

        return paid;

    },




    showYearlyReport() {

        const year =
            Number(
                document.getElementById("report-year").value
            );

        const report =
            this.getYearlyReport(year);

        const box =
            document.getElementById("yearly-report-result");

        box.innerHTML = `

<div class="card card-blue">
<h3>فروش</h3>
<p>${M.f(report.sales)} تومان</p>
</div>

<div class="card card-orange">
<h3>بهای تمام شده</h3>
<p>${M.f(report.cost)} تومان</p>
</div>

<div class="card card-red">
<h3>سود ناخالص</h3>
<p>${M.f(report.grossProfit)} تومان</p>
</div>

<div class="card card-red">
<h3>هزینه ها</h3>
<p>${M.f(report.expenses)} تومان</p>
</div>

<div class="card card-green">
<h3>سود خالص</h3>
<p>${M.f(report.netProfit)} تومان</p>
</div>

<div class="card">
<h3>تعداد فاکتور</h3>
<p>${report.invoiceCount}</p>
</div>

<div class="card">
<h3>تعداد هزینه</h3>
<p>${report.expenseCount}</p>
</div>

`;

    },



    render() {

        const yearSelect =
            document.getElementById("report-year");

        const monthYearSelect =
            document.getElementById("report-month-year");

        yearSelect.innerHTML = "";

        monthYearSelect.innerHTML = "";

        for (let y = 1400; y <= 1420; y++) {

            yearSelect.innerHTML +=
                `<option value="${y}">${y}</option>`;

            monthYearSelect.innerHTML +=
                `<option value="${y}">${y}</option>`;

        }

        const today = DateHelper.today();

        yearSelect.value = today.year;

        monthYearSelect.value = today.year;

        document.getElementById("report-month").value =
            today.month;

        this.showMonthlyReport();

        this.showYearlyReport();

    }


};




// --- Products Module ---
const Products = {
    render() {
        const tbody = document.getElementById('products-tbody');
        const products = DB.get('products');
        tbody.innerHTML = '';

        products.forEach(p => {
            tbody.innerHTML += `
                <tr>
                    <td>${p.name}</td>
                    <td>${p.unit}</td>
                    <td>${M.f(p.costPrice)}</td>
                    <td>${M.f(p.sellPrice)}</td>
                    <td>${M.f(p.stock)}</td>
                    <td>${p.type === 'مواد_اولیه' ? 'مواد اولیه' : 'محصول نهایی'}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="Products.edit('${p.id}')">ویرایش</button>
                        <button class="btn btn-sm btn-danger" onclick="Products.remove('${p.id}')">حذف</button>
                    </td>
                </tr>`;
        });

        // Reset Form
        document.getElementById('edit-product-id').value = '';
        document.getElementById('btn-save-product').textContent = 'ذخیره محصول';
        document.getElementById('p-name').value = '';
        document.getElementById("p-cost-price").value = "";
        document.getElementById("p-sell-price").value = "";
        document.getElementById('p-stock').value = '';
    },
    save(e) {
        e.preventDefault();
        const id = document.getElementById('edit-product-id').value;
        const data = {
            name: document.getElementById("p-name").value,

            unit: document.getElementById("p-unit").value,

            costPrice: M.f(
                document.getElementById("p-cost-price").value
            ),

            sellPrice: M.f(
                document.getElementById("p-sell-price").value
            ),

            stock: M.f(
                document.getElementById("p-stock").value
            ),

            type: document.getElementById("p-type").value
        };

        if (id) DB.update('products', id, data);
        else DB.insert('products', data);

        this.render();
    },
    edit(id) {
        const p = DB.getById('products', id);
        if (!p) return;
        document.getElementById('edit-product-id').value = p.id;
        document.getElementById('p-name').value = p.name;
        document.getElementById('p-unit').value = p.unit;
        document.getElementById("p-cost-price").value =
            p.costPrice;

        document.getElementById("p-sell-price").value =
            p.sellPrice;
        document.getElementById('p-stock').value = p.stock;
        document.getElementById('p-type').value = p.type;
        document.getElementById('btn-save-product').textContent = 'بروزرسانی محصول';
    },
    remove(id) {
        if (confirm('آیا از حذف این محصول مطمئن هستید؟')) {
            DB.delete('products', id);
            this.render();
        }
    }
};


// --- Customers Module ---
const Customers = {
    render() {
        const tbody = document.getElementById('customers-tbody');
        const customers = DB.get('customers');
        tbody.innerHTML = '';

        customers.forEach(c => {
            tbody.innerHTML += `
                <tr>
                    <td>${c.name}</td>
                    <td>${c.phone}</td>
                    <td>${c.address}</td>
                    <td>
    ${c.type === "supplier" ? "فروشنده" : "مشتری"}
</td>

<td style="
    color:${c.type === "supplier" ? "#2563eb" : "#dc2626"};
    font-weight:bold;">
    ${M.f(c.balance)}
</td>
                    <td>
    <button class="btn btn-sm btn-primary"
    onclick="Customers.edit('${c.id}')">
    ویرایش
    </button>

    <button class="btn btn-sm btn-danger"
    onclick="Customers.remove('${c.id}')">
    حذف
    </button>
</td>
                </tr>`;
        });

        document.getElementById('edit-customer-id').value = '';
        document.getElementById('c-name').value = '';
        document.getElementById('c-phone').value = '';
        document.getElementById('c-address').value = '';
        document.getElementById("c-balance").value = 0;
        document.getElementById("c-type").value = "customer";
        this.onTypeChange();

        document.getElementById("btn-save-customer").textContent =
            "ذخیره مشتری";
    },
    save(e) {
        e.preventDefault();
        const id = document.getElementById('edit-customer-id').value;
        const data = {
            name: document.getElementById('c-name').value,
            phone: document.getElementById('c-phone').value,
            address: document.getElementById('c-address').value,
            type: document.getElementById("c-type").value,
            balance: M.f(
                document.getElementById("c-balance").value
            )
        };

        if (id) {

            DB.update("customers", id, data);

        } else {

            DB.insert("customers", data);

        }
        this.render();
    },
    remove(id) {
        if (confirm('حذف مشتری؟ (توجه: فاکتورهای مرتبط حذف نمی‌شوند)')) {
            DB.delete('customers', id);
            this.render();
        }
    },
    onTypeChange() {

        const type = document.getElementById("c-type").value;

        document.getElementById("balance-label").textContent =
            type === "customer"
                ? "بدهی مشتری"
                : "طلب فروشنده";

    },
    edit(id) {

        const c = DB.getById("customers", id);

        if (!c) return;

        document.getElementById("edit-customer-id").value = c.id;
        document.getElementById("c-name").value = c.name;
        document.getElementById("c-phone").value = c.phone;
        document.getElementById("c-address").value = c.address;
        document.getElementById("c-type").value =
            c.type || "customer";
        document.getElementById("c-balance").value = c.balance;
        this.onTypeChange();

        document.getElementById("btn-save-customer").textContent =
            "بروزرسانی مشتری";
    }
};



// --- Create Invoice Module (Important Logic) ---
const InvoiceForm = {
    init() {
        const customerSelect = document.getElementById('inv-customer');

        const customers = DB.get("customers")
            .filter(c => (c.type || "customer") === "customer");

        customerSelect.innerHTML =
            '<option value="">انتخاب مشتری...</option>';

        customers.forEach(c => {
            customerSelect.innerHTML += `
        <option value="${c.id}">
            ${c.name}
        </option>`;
        });

        document.getElementById('invoice-items-tbody').innerHTML = '';
        this.calculate(); // Reset calc
    },
    addRow() {
        const products = DB.get('products');
        const tbody = document.getElementById('invoice-items-tbody');
        const rowId = Date.now();

        let optionsHtml = '<option value="">انتخاب محصول...</option>';
        products.forEach(p => {
            optionsHtml += `
<option
value="${p.id}"
data-cost="${p.costPrice}"
data-price="${p.sellPrice}"
data-stock="${p.stock}">
${p.name}
(موجودی: ${p.stock})
</option>`;
        });

        const tr = document.createElement('tr');
        tr.id = `row-${rowId}`;
        tr.innerHTML = `
            <td><select class="inv-product" onchange="InvoiceForm.onProductChange(this)">${optionsHtml}</select></td>
            <td><input type="number" class="inv-qty" min="0" step="0.5" value="0" onchange="InvoiceForm.calculate()" oninput="InvoiceForm.calculate()"></td>
            <td><input type="text" class="inv-price" readonly value="0.00"></td>
            <td><input type="text" class="inv-total" readonly value="0.00"></td>
            <td><button class="btn btn-sm btn-danger" onclick="this.closest('tr').remove(); InvoiceForm.calculate();">حذف</button></td>
        `;
        tbody.appendChild(tr);
    },
    onProductChange(selectEl) {
        const row = selectEl.closest('tr');
        const selectedOption = selectEl.options[selectEl.selectedIndex];
        const price = selectedOption.getAttribute('data-price') || 0;
        row.querySelector('.inv-price').value = M.f(price);
        this.calculate();
    },
    calculate() {
        let subtotal = 0;
        const rows = document.querySelectorAll('#invoice-items-tbody tr');

        rows.forEach(row => {
            const qty = M.p(row.querySelector('.inv-qty').value);
            const price = M.p(row.querySelector('.inv-price').value);
            const rowTotal = M.f(qty * price);
            row.querySelector('.inv-total').value = rowTotal;
            subtotal += M.p(rowTotal);
        });

        const discount = M.p(document.getElementById('calc-discount').value);
        const taxable = M.p(subtotal) - discount;
        const finalTotal = taxable;

        document.getElementById('calc-subtotal').textContent = M.f(subtotal);
        document.getElementById('calc-taxable').textContent = M.f(taxable);
        document.getElementById('calc-final').textContent = M.f(finalTotal);
    },
    submit() {

        const customerId = document.getElementById("inv-customer").value;

        if (!customerId)
            return alert("لطفا یک مشتری را انتخاب کنید.");

        const customer = DB.getById("customers", customerId);

        if (!customer)
            return alert("مشتری پیدا نشد.");

        if ((customer.type || "customer") !== "customer")
            return alert("فقط مشتری می‌تواند برای فاکتور انتخاب شود.");

        const rows =
            document.querySelectorAll("#invoice-items-tbody tr");

        if (rows.length === 0)
            return alert("حداقل یک کالا وارد کنید.");


        const items = [];

        let isValid = true;

        let invoiceCost = 0;

        let invoiceProfit = 0;

        rows.forEach(row => {

            const productId =
                row.querySelector(".inv-product").value;

            const qty =
                M.p(row.querySelector(".inv-qty").value);

            const price =
                M.p(row.querySelector(".inv-price").value);

            if (!productId || qty <= 0) {

                isValid = false;
                return;

            }

            const product =
                DB.getById("products", productId);

            if (!product) {

                isValid = false;
                return;

            }

            if (M.p(product.stock) < qty) {

                alert(`موجودی کافی نیست برای ${product.name}`);

                isValid = false;

                return;

            }

            items.push({

                productId: product.id,

                productName: product.name,

                unit: product.unit,

                qty: M.f(qty),

                price: M.f(price),

                total: M.f(qty * price)

            });

            invoiceCost +=
                M.p(product.costPrice) * qty;

            invoiceProfit +=
                (M.p(product.sellPrice) - M.p(product.costPrice)) * qty;

        });

        if (!isValid)
            return;

        const subtotal =
            M.p(document.getElementById("calc-subtotal").textContent);

        const discount =
            M.p(document.getElementById("calc-discount").value);

        const finalTotal =
            subtotal - discount;


        const customerData = DB.getById("customers", customerId);

        const previousBalance = M.p(customerData.balance);

        const dateInfo =
            DateHelper.parse(
                document.getElementById("inv-date").value
            );



        const invoiceData = {

            customerId,

            description: `فروش کالا به ${customer.name}`,

            personType: "customer",

            date: dateInfo.date,

            year: dateInfo.year,

            month: dateInfo.month,

            day: dateInfo.day,

            timestamp: dateInfo.timestamp,

            items,

            discount: M.f(discount),

            tax: "0",

            total: M.f(subtotal),

            finalTotal: M.f(finalTotal),

            cost: M.f(invoiceCost),

            profit: M.f(invoiceProfit),

            isPaid: false,

            source: "invoice",

            createdAt: Date.now()

        };

        // ذخیره فاکتور

        const savedInvoice =
            DB.insert("invoices", invoiceData);

        // ثبت سود

        DB.insert("profits", {

            invoiceId: savedInvoice.id,

            customerId,

            customerName: customer.name,

            date: invoiceData.date,

            year: invoiceData.year,

            month: invoiceData.month,

            day: invoiceData.day,

            timestamp: invoiceData.timestamp,

            cost: M.f(invoiceCost),

            sale: M.f(finalTotal),

            profit: M.f(invoiceProfit)

        });

        // کم کردن موجودی

        items.forEach(item => {

            const product =
                DB.getById("products", item.productId);

            DB.update("products", item.productId, {

                stock: M.f(
                    M.p(product.stock) - M.p(item.qty)
                )

            });

        });

        // افزایش بدهی مشتری

        DB.update("customers", customerId, {
            balance: M.f(previousBalance + finalTotal)
        });

        alert("فاکتور با موفقیت ثبت شد.");

        Dashboard.render();

        Customers.render();

        document.querySelector('[data-page="invoices"]').click();

    }
};

// --- Invoices List & Settlement Module ---
const InvoicesList = {
    render() {
        const tbody = document.getElementById('invoices-tbody');
        const invoices = DB.get('invoices');
        const customers = DB.get('customers');
        tbody.innerHTML = '';

        // Sort by date descending (simple string sort works for YYYY-MM-DD)
        invoices.sort((a, b) => b.date.localeCompare(a.date));

        invoices.forEach(inv => {
            const customer = customers.find(c => c.id === inv.customerId);
            const cName = customer ? customer.name : 'حذف شده';
            const paidAmount =
                Reports.getInvoicePaid(inv.id);

            let remain =
                Math.max(
                    0,
                    M.p(inv.finalTotal) - paidAmount
                );

            if (inv.paid)
                remain = 0;

            const isPaid =
                inv.paid || remain <= 0;

            const statusColor = isPaid ? "green" : "red";

            const statusText =
                isPaid
                    ? "تسویه شده"
                    : `تسویه: ${M.f(paidAmount)} | مانده: ${M.f(remain)}`;

            // Note: isPaid logic here is conceptual. True settlement is tracked by customer.balance.
            // But for UI sake, we show based on invoice finalTotal (if settled later, we could add a settledAmount to invoice, but spec said reduce from customer balance directly).

            tbody.innerHTML += `
                <tr>
                    <td>${inv.id.substr(0, 8)}</td>
                    <td>${cName}</td>
                    <td>${inv.date}</td>
                    <td>${M.f(inv.finalTotal)} تومان</td>
                    <td style="color:${statusColor}">${statusText}</td>
                    <td>
                        <button class="btn btn-sm btn-success" onclick="InvoicesList.showPdf('${inv.id}')">PDF</button>
                     ${!isPaid
                    ? `<button class="btn btn-sm btn-success"
        onclick="InvoicesList.payFullInvoice('${inv.id}','${inv.customerId}')">
        پرداخت کامل
       </button>`
                    : `<span style="color:green;font-weight:bold;">✓ تسویه شده</span>`
                }
                    </td>
                </tr>`;
        });
    },

   
payFullInvoice(invId, custId) {
    const invoice = DB.getById("invoices", invId);
    const customer = DB.getById("customers", custId);

    if (!invoice || !customer) {
        alert("فاکتور یا مشتری پیدا نشد.");
        return;
    }

    // مجموع چک‌های وصول‌شده که به همین فاکتور وصل‌اند
    const paidByChecks = DB.get("checks")
        .filter(c =>
            c.invoiceId === invId &&
            c.status === "وصول شده" &&
            c.type === "دریافتی"
        )
        .reduce((sum, c) => sum + M.p(c.amount), 0);

    // مجموع پرداخت‌های نقدی قبلی که به همین فاکتور وصل‌اند
    const paidByCash = DB.get("cashTransactions")
        .filter(t =>
            t.invoiceId === invId &&
            t.personId === custId &&
            (t.personType || "customer") === "customer"
        )
        .reduce((sum, t) => sum + M.p(t.amount), 0);

    const totalPaid = paidByChecks + paidByCash;
    const invoiceTotal = M.p(invoice.finalTotal);
    const remaining = Math.max(0, invoiceTotal - totalPaid);

    if (remaining <= 0) {
        DB.update("invoices", invId, {
            paid: true,
            paidAmount: invoiceTotal
        });

        alert("این فاکتور قبلاً تسویه شده است.");
        InvoicesList.render();
        return;
    }

    if (!confirm(
        `مانده فاکتور: ${M.f(remaining)} تومان\n` +
        "آیا پرداخت نقدی همین مبلغ ثبت شود؟"
    )) {
        return;
    }

    const customerBalance = M.p(customer.balance);
    const newBalance = Math.max(0, customerBalance - remaining);
    const today = DateHelper.today();

    // ثبت فقط مبلغ باقی‌مانده
    DB.insert("cashTransactions", {
        personId: custId,
        personName: customer.name,
        personType: "customer",
        type: "cash",
        amount: remaining,
        invoiceId: invId,
        purchaseId: null,
        description: `دریافت نقدی بابت فاکتور ${invoice.id}`,
        date: today.date,
        year: today.year,
        month: today.month,
        day: today.day,
        timestamp: today.timestamp,
        createdAt: Date.now()
    });

    // کاهش مانده مشتری فقط به‌اندازه مبلغ باقی‌مانده
    DB.update("customers", custId, {
        balance: M.f(newBalance)
    });

    DB.update("invoices", invId, {
        paid: true,
        paidAmount: invoiceTotal
    });

    alert(
        `فاکتور تسویه شد.\n` +
        `مبلغ پرداختی: ${M.f(remaining)} تومان`
    );

    InvoicesList.render();
    Checks.render();
    Dashboard.render();
    Customers.render();

    if (typeof Ledger !== "undefined") {
        Ledger.renderSummary();
        Ledger.renderHistory();
    }
},



    currentPayData: { invId: '', custId: '' },

    openPayModal(invId, custId) {
        this.currentPayData = { invId, custId };
        document.getElementById('modal-inv-id').textContent = invId.substr(0, 8);
        document.getElementById('pay-amount').value = '';
        document.getElementById('payment-modal').classList.add('show');
    },
    confirmPayment() {

        const amount =
            M.p(
                document.getElementById("pay-amount").value
            );

        if (amount <= 0)
            return alert("مبلغ صحیح وارد کنید");

        const customer =
            DB.getById(
                "customers",
                this.currentPayData.custId
            );

        const invoice =
            DB.getById(
                "invoices",
                this.currentPayData.invId
            );

        const today =
            DateHelper.today();

        const newBalance =
            M.p(customer.balance) - amount;

        if (newBalance < 0)
            return alert("مبلغ وارد شده بیشتر از بدهی مشتری است!");

        //--------------------------------------------------
        // کم شدن طلب مشتری
        //--------------------------------------------------

        DB.update(
            "customers",
            customer.id,
            {
                balance: M.f(newBalance)
            }
        );

        //--------------------------------------------------
        // ثبت پرداخت نقدی
        //--------------------------------------------------

        DB.insert(
            "cashTransactions",
            {

                personId: customer.id,

                personName: customer.name,

                personType: "customer",

                invoiceId:
                    invoice ? invoice.id : null,

                amount: amount,

                date: today.date,

                year: today.year,

                month: today.month,

                day: today.day,

                timestamp: today.timestamp,

                description:
                    invoice
                        ? `دریافت نقدی بابت فاکتور ${invoice.id}`
                        : "دریافت نقدی"

            }
        );

        //--------------------------------------------------
        // اگر فاکتور کامل تسویه شد
        //--------------------------------------------------

        if (invoice) {

            const paid =
                Reports.getInvoicePaid(invoice.id);

            const remain =
                Math.max(
                    0,
                    M.p(invoice.finalTotal)
                    -
                    paid
                );

            DB.update(
                "invoices",
                invoice.id,
                {
                    paid:
                        remain <= 0
                }
            );

        }

        document
            .getElementById("payment-modal")
            .classList.remove("show");

        alert("پرداخت با موفقیت ثبت شد.");

        Dashboard.render();

        Customers.render();

        InvoicesList.render();

        Checks.render();

        Ledger.renderSummary();

        Ledger.renderHistory();

    },

    // Basic PDF Implementation
    async showPdf(invId) {
        const inv = DB.getById('invoices', invId);
        if (!inv) return;
        const customer = DB.getById('customers', inv.customerId);

        // Fill Template
        document.getElementById('pdf-customer-name').textContent = customer ? customer.name : 'نامشخص';
        document.getElementById('pdf-date').textContent = inv.date;
        document.getElementById('pdf-inv-id').textContent = inv.id.substr(0, 8);
        document.getElementById('pdf-subtotal').textContent = inv.total;
        document.getElementById('pdf-discount').textContent = inv.discount;
        document.getElementById('pdf-final').textContent = inv.finalTotal;
        document.getElementById("pdf-prev-balance").textContent =
            inv.previousBalance;

        document.getElementById("pdf-current-total").textContent =
            inv.finalTotal;

        document.getElementById("pdf-new-balance").textContent =
            inv.newBalance;

        const pdfBody = document.getElementById('pdf-items-body');
        pdfBody.innerHTML = '';
        inv.items.forEach((item, index) => {
            pdfBody.innerHTML += `<tr>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${index + 1}</td>
                <td style="border: 1px solid #000; padding: 8px;">${item.productName}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.unit}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: center;">${item.qty}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: left;">${item.price}</td>
                <td style="border: 1px solid #000; padding: 8px; text-align: left;">${item.total}</td>
            </tr>`;
        });
        // Render to PDF
        const element = document.getElementById('pdf-template');
        // Temporarily show for html2canvas
        element.style.left = '0px';
        element.style.position = 'absolute';
        element.style.zIndex = '-1';

        try {
            const canvas = await html2canvas(element, { scale: 2 });
            const imgData = canvas.toDataURL('image/png');

            const { jsPDF } = window.jspdf;
            const pdf = new jsPDF('l', 'mm', 'a4'); // Landscape

            const pdfWidth = pdf.internal.pageSize.getWidth();
            const pdfHeight = pdf.internal.pageSize.getHeight();
            const imgWidth = canvas.width;
            const imgHeight = canvas.height;
            const ratio = Math.min(pdfWidth / imgWidth, pdfHeight / imgHeight);
            const imgX = (pdfWidth - imgWidth * ratio) / 2;

            pdf.addImage(imgData, 'PNG', imgX, 10, imgWidth * ratio, imgHeight * ratio);
            pdf.save(`invoice-${inv.id.substr(0, 8)}.pdf`);
        } catch (err) {
            console.error(err);
            alert('خطا در ساخت PDF');
        } finally {
            element.style.left = '-9999px';
        }
    }
};


// --- Workers Module ---
const Workers = {
    render() {
        const tbody = document.getElementById('workers-tbody');
        const workers = DB.get('workers');
        tbody.innerHTML = '';

        workers.forEach(w => {
            tbody.innerHTML += `
                <tr>
                    <td>${w.name}</td>
                    <td>${w.role}</td>
                    <td>${M.f(w.baseSalary)}</td>
                    <td>
                        <button class="btn btn-sm btn-danger" onclick="Workers.remove('${w.id}')">حذف</button>
                    </td>
                </tr>`;
        });
        document.getElementById('w-name').value = '';
        document.getElementById('w-role').value = '';
        document.getElementById('w-salary').value = '';
    },
    save(e) {
        e.preventDefault();
        const data = {
            name: document.getElementById('w-name').value,
            role: document.getElementById('w-role').value,
            baseSalary: M.f(document.getElementById('w-salary').value)
        };
        if (!data.name) return alert('نام کارگر را وارد کنید');
        DB.insert('workers', data);
        this.render();
    },
    remove(id) {
        if (confirm('آیا از حذف این کارگر مطمئن هستید؟')) {
            DB.delete('workers', id);
            this.render();
        }
    }
};

// --- Salaries Module ---
const Salaries = {
    init() {
        const select = document.getElementById('sal-worker');
        const workers = DB.get('workers');
        const today = DateHelper.today();
        document.getElementById("sal-year").value = today.year;
        document.getElementById("sal-year").readOnly = true;
        select.innerHTML = '<option value="">انتخاب کارگر...</option>';
        workers.forEach(w => {
            select.innerHTML += `<option value="${w.id}" data-salary="${w.baseSalary}">${w.name}</option>`;
        });
        // Auto-fill base salary on worker select
        select.addEventListener('change', (e) => {
            const opt = e.target.options[e.target.selectedIndex];
            document.getElementById('sal-base').value = opt.getAttribute('data-salary') || 0;
            this.calcNet();
        });
        this.calcNet();
    },
    calcNet() {
        const base = M.p(document.getElementById('sal-base').value);
        const overtime = M.p(document.getElementById('sal-overtime').value);
        const bonus = M.p(document.getElementById('sal-bonus').value);
        const deduction = M.p(document.getElementById('sal-deduction').value);
        const insurance = M.p(document.getElementById('sal-insurance').value);
        const tax = M.p(document.getElementById('sal-tax').value);

        // Net = (Base + Overtime + Bonus) - (Deduction + Insurance + Tax)
        const net = (base + overtime + bonus) - (deduction + insurance + tax);
        document.getElementById('sal-net').textContent = M.f(net);
    },
    save(e) {
        e.preventDefault();
        const workerId = document.getElementById('sal-worker').value;
        if (!workerId) return alert('کارگر را انتخاب کنید');

        const worker = DB.getById('workers', workerId);
        const base = M.p(document.getElementById('sal-base').value);
        const overtime = M.p(document.getElementById('sal-overtime').value);
        const bonus = M.p(document.getElementById('sal-bonus').value);
        const deduction = M.p(document.getElementById('sal-deduction').value);
        const insurance = M.p(document.getElementById('sal-insurance').value);
        const tax = M.p(document.getElementById('sal-tax').value);
        const net = (base + overtime + bonus) - (deduction + insurance + tax);

        const dateInfo = DateHelper.parse(

            document.getElementById("sal-year").value +
            "/" +
            document.getElementById("sal-month").value.padStart(2, "0") +
            "/01"

        );

        DB.insert('salaries', {

            workerId,

            workerName: worker.name,

            year: document.getElementById('sal-year').value,

            month: document.getElementById('sal-month').value,

            base: M.f(base),

            overtime: M.f(overtime),

            bonus: M.f(bonus),

            deduction: M.f(deduction),

            insurance: M.f(insurance),

            tax: M.f(tax),

            netPay: M.f(net),

            // ----------------------------
            // فیلدهای استاندارد موتور حسابداری
            // ----------------------------

            amount: M.f(net),

            date: dateInfo.date,

            year: dateInfo.year,

            month: dateInfo.month,

            day: dateInfo.day,

            timestamp: dateInfo.timestamp,

            source: "salary",

            createdAt: Date.now()

        });

        // ثبت خودکار حقوق در دفتر هزینه
        DB.insert("expenses", {

            category: "حقوق",

            amount: M.f(net),

            date: dateInfo.date,

            year: dateInfo.year,

            month: dateInfo.month,

            day: dateInfo.day,

            timestamp: dateInfo.timestamp,

            description:
                `حقوق ${worker.name} - ${document.getElementById("sal-month").value}/${document.getElementById("sal-year").value}`,

            source: "salary",

            workerId: workerId,

            createdAt: Date.now()

        });

        alert("فیش حقوقی با موفقیت ثبت شد.");

        this.renderTable();

        Expenses.render();

        Dashboard.render();
    },
    renderTable() {
        const tbody = document.getElementById('salaries-tbody');
        const salaries = DB.get('salaries');
        tbody.innerHTML = '';

        salaries.sort((a, b) => `${b.year}${b.month}`.localeCompare(`${a.year}${a.month}`));

        salaries.forEach(s => {
            tbody.innerHTML += `
                <tr>
                    <td>${s.workerName}</td>
                    <td>${s.year}/${s.month}</td>
                    <td>${s.base}</td>
                    <td>${s.overtime}</td>
                    <td style="color:red;">${s.deduction}</td>
                    <td style="font-weight:bold; color: var(--primary);">${s.netPay}</td>
                    <td><button class="btn btn-sm btn-danger" onclick="Salaries.remove('${s.id}')">حذف</button></td>
                </tr>`;
        });
    },
    remove(id) {

        if (!confirm("حذف این فیش حقوق؟"))
            return;

        const salary =
            DB.getById("salaries", id);

        if (salary) {

            const expenses =
                DB.get("expenses");

            const exp =
                expenses.find(e =>
                    e.source === "salary"
                    &&
                    e.workerId === salary.workerId
                    &&
                    e.amount === salary.netPay
                );

            if (exp) {

                DB.delete(
                    "expenses",
                    exp.id
                );

            }

        }

        DB.delete(
            "salaries",
            id
        );

        this.renderTable();

        Expenses.render();

        Dashboard.render();

    }
};




// ===============================
// Expenses Module
// ===============================



// ===============================
// Purchase History Module
// ===============================

const PurchaseHistory = {


    loadSuppliers() {

        const select =
            document.getElementById("purchase-supplier");

        select.innerHTML =
            '<option value="">انتخاب فروشنده...</option>';

        DB.get("customers")
            .filter(c => c.type === "supplier")
            .forEach(c => {

                select.innerHTML += `
<option value="${c.id}">
${c.name}
</option>
`;

            });

    },

    calculate() {

        const qty =
            M.p(
                document.getElementById("purchase-count").value
            );

        const price =
            M.p(
                document.getElementById("purchase-price").value
            );

        document.getElementById("purchase-total").value =
            M.f(qty * price);

    },


    save() {

        const supplierId =
            document.getElementById("purchase-supplier").value;

        if (!supplierId)
            return alert("فروشنده را انتخاب کنید.");

        const supplier =
            DB.getById("customers", supplierId);

        if (!supplier)
            return alert("فروشنده پیدا نشد.");

        const productName =
            document.getElementById("purchase-product").value.trim();

        const unit =
            document.getElementById("purchase-unit").value.trim();

        if (!unit)
            return alert("واحد کالا را وارد کنید.");

        const count =
            M.p(document.getElementById("purchase-count").value);

        const price =
            M.p(document.getElementById("purchase-price").value);

        if (!productName)
            return alert("نام کالا را وارد کنید.");

        if (count <= 0)
            return alert("تعداد معتبر نیست.");

        if (price <= 0)
            return alert("قیمت معتبر نیست.");

        const total = count * price;
        const today = DateHelper.today();

        DB.insert("purchaseHistory", {

            supplierId: supplier.id,

            supplierName: supplier.name,

            description:
                `خرید ${M.f(count)} ${unit} ${productName} از ${supplier.name}`,

            productName,

            unit,

            count,

            price,

            total,

            paid: 0,

            remain: total,

            date: today.date,

            year: today.year,

            month: today.month,

            day: today.day,

            timestamp: today.timestamp,

            createdAt: Date.now()
        });


        //----------------------------------------------------
        // بروزرسانی انبار
        //----------------------------------------------------

        const products = DB.get("products");

        const existing = products.find(p =>

            p.name.trim().toLowerCase() ===
            productName.trim().toLowerCase()

            &&

            p.unit.trim().toLowerCase() ===
            unit.trim().toLowerCase()

        );

        if (!existing) {

            //------------------------------------------------
            // محصول وجود ندارد
            //------------------------------------------------

            DB.insert("products", {

                name: productName,

                unit,

                type: "مواد اولیه",

                stock: M.f(count),

                costPrice: M.f(price),

                sellPrice: 0

            });

        }

        else {

            //------------------------------------------------
            // قیمت یکی است
            //------------------------------------------------

            if (M.p(existing.costPrice) === price) {

                DB.update("products", existing.id, {

                    stock:
                        M.f(
                            M.p(existing.stock) + count
                        )

                });

            }

            //------------------------------------------------
            // قیمت فرق دارد
            //------------------------------------------------

            else {

                const updatePrice = confirm(

                    `این کالا قبلاً در انبار وجود دارد.

قیمت قبلی:
${M.f(existing.costPrice)}

قیمت جدید:
${M.f(price)}

OK = بروزرسانی قیمت

Cancel = ثبت نسخه جدید`

                );

                //------------------------------------------------
                // بروزرسانی قیمت
                //------------------------------------------------

                if (updatePrice) {

                    DB.update("products", existing.id, {

                        costPrice: M.f(price),

                        stock:
                            M.f(
                                M.p(existing.stock) + count
                            )

                    });

                }

                //------------------------------------------------
                // ثبت دشت جدید
                //------------------------------------------------

                else {

                    let version = 2;

                    while (

                        DB.get("products").find(p =>

                            p.name === `${productName} دشت ${version}`

                        )

                    ) {

                        version++;

                    }

                    DB.insert("products", {

                        name: `${productName} دشت ${version}`,

                        unit,

                        type: "مواد اولیه",

                        stock: M.f(count),

                        costPrice: M.f(price),

                        sellPrice: 0

                    });

                }

            }

        }

        DB.update(
            "customers",
            supplier.id,
            {

                balance:
                    M.f(

                        M.p(supplier.balance)

                        +

                        total

                    )

            }

        );

        Customers.render();

        Dashboard.render();

        Products.render();
        this.render();
        alert("خرید ثبت شد.");

        document.getElementById("purchase-supplier").selectedIndex = 0;

        document.getElementById("purchase-product").value = "";

        document.getElementById("purchase-unit").value = "";

        document.getElementById("purchase-count").value = 1;

        document.getElementById("purchase-price").value = "";

        PurchaseHistory.calculate();

        document.getElementById("purchase-product").focus();

    },


    render() {

        const tbody =
            document.getElementById("purchase-history-tbody");

        tbody.innerHTML = "";

        const purchases =
            DB.get("purchaseHistory");

        purchases
            .sort((a, b) => b.createdAt - a.createdAt)
            .forEach(item => {

                tbody.innerHTML += `

<tr>

<td>${item.date}</td>

<td>${item.supplierName}</td>

<td>${item.productName}</td>

<td>${M.f(item.count)}</td>

<td>${M.f(item.price)}</td>

<td>${M.f(item.total)}</td>

<td>

${M.f(item.paid)}

تومان

</td>

<td>

${M.f(item.remain)}

تومان

</td>

<td>

${item.remain > 0 ?

                        `<button
class="btn btn-sm btn-success"
onclick="PurchaseHistory.payFull('${item.id}')">

تسویه کامل

</button>`

                        :

                        `<span style="color:green;font-weight:bold;">

✓ تسویه شده

</span>`

                    }

</td>

</tr>

`;

            });

    },


    payFull(id) {

        const purchase =
            DB.getById("purchaseHistory", id);

        if (!purchase)
            return;

        if (purchase.remain <= 0)
            return;

        const supplier =
            DB.getById(
                "customers",
                purchase.supplierId
            );

        DB.insert(
            "cashTransactions",
            {

                personId: purchase.supplierId,

                personName: supplier.name,

                personType: "supplier",

                type: "cash",

                amount: M.p(purchase.remain),

                invoiceId: null,

                purchaseId: purchase.id,

                description:
                    `پرداخت نقدی بابت خرید ${purchase.productName}`,

                date: DateHelper.today().date,

                year: DateHelper.today().year,

                month: DateHelper.today().month,

                day: DateHelper.today().day,

                timestamp: DateHelper.today().timestamp,

                createdAt: Date.now()

            }
        );

        DB.update(
            "customers",
            supplier.id,
            {

                balance:
                    M.f(

                        M.p(supplier.balance)

                        -

                        purchase.remain

                    )

            }
        );

        DB.update(
            "purchaseHistory",
            id,
            {

                paid:
                    purchase.total,

                remain:
                    0

            }
        );

        Customers.render();

        Dashboard.render();

        Ledger.renderSummary();

        Ledger.renderHistory();

        this.render();

    },

    init() {

        this.loadSuppliers();

        document
            .getElementById("purchase-count")
            .addEventListener(
                "input",
                () => this.calculate()
            );

        document
            .getElementById("purchase-price")
            .addEventListener(
                "input",
                () => this.calculate()
            );


        this.calculate();
        this.render();

    },
};




const Expenses = {

    render() {

        const tbody =
            document.getElementById("expenses-tbody");

        const expenses =
            DB.get("expenses");

        tbody.innerHTML = "";

        expenses.sort(
            (a, b) => b.date.localeCompare(a.date)
        );

        expenses.forEach(exp => {

            const color =
                exp.source === "salary"
                    ? "#2563eb"
                    : "#dc2626";

            const sourceText =
                exp.source === "salary"
                    ? " (حقوق)"
                    : "";

            tbody.innerHTML += `

<tr>

<td>${exp.date}</td>

<td style="color:${color};font-weight:bold;">
${exp.category}${sourceText}
</td>

<td>${M.f(exp.amount)}</td>

<td>${exp.description}</td>

<td>

${exp.source === "salary"
                    ?
                    `<span style="color:#2563eb;font-weight:bold;">
سیستمی
</span>`
                    :
                    `
<button
class="btn btn-sm btn-primary"
onclick="Expenses.edit('${exp.id}')">

ویرایش

</button>
`
                }

${exp.source === "salary"
                    ?
                    ""
                    :
                    `
<button
class="btn btn-sm btn-danger"
onclick="Expenses.remove('${exp.id}')">

حذف

</button>
`
                }

</td>

</tr>

`;

        });

        document.getElementById("edit-expense-id").value = "";

        document.getElementById("exp-category").value = "برق";

        document.getElementById("exp-amount").value = "";

        document.getElementById("exp-desc").value = "";

        document.getElementById("btn-save-expense").textContent =
            "ثبت هزینه";

    },



    save(e) {

        e.preventDefault();

        const id =
            document.getElementById("edit-expense-id").value;


        const dateInfo = DateHelper.parse(
            document.getElementById("exp-date").value
        );

        const data = {

            category:
                document.getElementById("exp-category").value,

            amount:
                M.f(document.getElementById("exp-amount").value),

            date: dateInfo.date,

            year: dateInfo.year,

            month: dateInfo.month,

            day: dateInfo.day,

            timestamp: dateInfo.timestamp,

            description:
                document.getElementById("exp-desc").value,

            source: "expense",

            workerId: null,

            createdAt: Date.now()

        };

        if (id) {

            DB.update(
                "expenses",
                id,
                data
            );

        }

        else {

            DB.insert(
                "expenses",
                data
            );

        }

        this.render();

        Dashboard.render();

    },



    edit(id) {

        const exp =
            DB.getById(
                "expenses",
                id
            );

        if (!exp)
            return;

        document.getElementById("edit-expense-id").value =
            exp.id;

        document.getElementById("exp-category").value =
            exp.category;

        document.getElementById("exp-amount").value =
            M.p(exp.amount);

        document.getElementById("exp-date").value =
            exp.date;

        document.getElementById("exp-desc").value =
            exp.description;

        document.getElementById("btn-save-expense").textContent =
            "بروزرسانی هزینه";

    },



    remove(id) {

        if (!confirm("حذف این هزینه؟"))
            return;

        DB.delete(
            "expenses",
            id
        );

        this.render();

        Dashboard.render();

    }

};



// --- Checks Module ---
const Checks = {
    render() {
        // Populate Customers Dropdown

        const customerSelect =
            document.getElementById("ch-customer");

        const persons = DB.get("customers");

        customerSelect.innerHTML =
            '<option value="">انتخاب شخص...</option>';

        persons.forEach(p => {

            const title =
                p.type === "supplier"
                    ? "فروشنده"
                    : "مشتری";

            customerSelect.innerHTML += `
        <option value="${p.id}">
            ${p.name} (${title})
        </option>
        
    `;

        });

        this.renderTable();
        this.updateAlert();


        // Reset Form
        document.getElementById('edit-check-id').value = '';
        document.getElementById('ch-bank').value = '';
        document.getElementById('ch-number').value = '';
        document.getElementById('ch-amount').value = '';
        document.getElementById('ch-status').value = 'وصول نشده';
        document.getElementById("ch-reason").value = "";
    },


    onTypeChange() {

        const type =
            document.getElementById("ch-type").value;

        const customerSelect =
            document.getElementById("ch-customer");

        customerSelect.innerHTML =
            '<option value="">انتخاب شخص...</option>';

        const persons =
            DB.get("customers");

        if (type === "دریافتی") {

            persons
                .filter(p => (p.type || "customer") === "customer")
                .forEach(p => {

                    customerSelect.innerHTML += `
<option value="${p.id}">
${p.name} (مشتری)
</option>
`;

                });

        }

        else {

            persons
                .filter(p => p.type === "supplier")
                .forEach(p => {

                    customerSelect.innerHTML += `
<option value="${p.id}">
${p.name} (فروشنده)
</option>
`;

                });

        }

        document.getElementById("ch-customer").value = "";

        document.getElementById("check-invoice").innerHTML =
            '<option value="">انتخاب...</option>';

    },



    save(e) {
        e.preventDefault();
        const id = document.getElementById('edit-check-id').value;
        const customerId = document.getElementById('ch-customer').value;
        if (!customerId) return alert('مشتری یا بستانکار را انتخاب کنید');

        const person =
            DB.getById("customers", customerId);

        if (!person)
            return alert("شخص پیدا نشد.");


        const dueInfo = DateHelper.parse(
            document.getElementById("ch-due-date").value
        );

        const data = {
            customerId,
            type: document.getElementById('ch-type').value,
            personType: person.type || "customer",
            bank: document.getElementById('ch-bank').value,
            number: document.getElementById('ch-number').value,
            reason: document.getElementById("ch-reason").value,
            dueDate: dueInfo.date,

            year: dueInfo.year,

            month: dueInfo.month,

            day: dueInfo.day,

            timestamp: dueInfo.timestamp,
            amount: M.f(document.getElementById('ch-amount').value),
            invoiceId:
                document.getElementById("check-invoice").value || null,

            purchaseId:
                document.getElementById("ch-type").value === "پرداختی"

                    ? document.getElementById("check-invoice").value

                    : null,

            purchaseAmount: 0,

            paidAmount: 0,

            isApplied: false,
            status: document.getElementById('ch-status').value
        };



        if (id) {

            const oldCheck = DB.getById("checks", id);
            const person = DB.getById("customers", oldCheck.customerId);

            // اگر قبلاً چک پرداختی وصول نشده بوده، اثرش را برگردان
            if (
                person &&
                person.type === "supplier" &&
                oldCheck.type === "پرداختی" &&
                oldCheck.status === "وصول نشده"
            ) {

                DB.update("customers", person.id, {
                    balance: M.f(
                        M.p(person.balance) -
                        M.p(oldCheck.amount)
                    )
                });

            }

            DB.update("checks", id, data);

            const newPerson = DB.getById("customers", data.customerId);

            // اعمال دوباره اثر چک جدید
            if (
                newPerson &&
                newPerson.type === "supplier" &&
                data.type === "پرداختی" &&
                data.status === "وصول نشده"
            ) {


            }

        } else {

            DB.insert("checks", data);
            if (data.purchaseId) {

                const purchase =
                    DB.getById(
                        "purchaseHistory",
                        data.purchaseId
                    );

                if (purchase) {

                    DB.update(
                        "checks",
                        data.id,
                        {

                            purchaseAmount:
                                purchase.total

                        }

                    );

                }

            }

            // اگر چک پرداختی برای فروشنده ثبت شد و هنوز وصول نشده بود

        }

        this.render();
        Dashboard.render();

        Customers.render();

        InvoicesList.render();

        Checks.render();
        this.updateAlert();
    },
    edit(id) {
        const ch = DB.getById('checks', id);
        if (!ch) return;
        document.getElementById('edit-check-id').value = ch.id;
        document.getElementById('ch-customer').value = ch.customerId;
        this.loadInvoices(ch.customerId);

        document.getElementById("check-invoice").value =
            ch.invoiceId || "";
        document.getElementById('ch-type').value = ch.type;
        document.getElementById('ch-bank').value = ch.bank;
        document.getElementById('ch-number').value = ch.number;
        document.getElementById("ch-reason").value = ch.reason || "";
        document.getElementById('ch-due-date').value = ch.dueDate;
        document.getElementById('ch-amount').value = ch.amount;
        document.getElementById('ch-status').value = ch.status;
    },

    loadInvoices(customerId) {

        console.log("TYPE:", document.getElementById("ch-type").value);
        console.log("CUSTOMER:", customerId);
        console.log(DB.get("purchaseHistory"));

        const select =
            document.getElementById("check-invoice");

        select.innerHTML = "";

        const type =
            document.getElementById("ch-type").value;

        //------------------------------------------------
        // پرداختی به تامین کننده
        //------------------------------------------------

        if (type === "پرداختی") {

            select.innerHTML =
                '<option value="">انتخاب خرید...</option>';

            DB.get("purchaseHistory")
                .filter(p =>
                    p.supplierId === customerId &&
                    p.remain > 0
                )
                .forEach(p => {

                    select.innerHTML += `
<option value="${p.id}">
${p.productName}
 | مانده:
${M.f(p.remain)}
</option>
`;

                });

            return;
        }

        //------------------------------------------------
        // فاکتور فروش
        //------------------------------------------------

        select.innerHTML =
            '<option value="">انتخاب فاکتور...</option>';

        DB.get("invoices")
            .filter(inv => {

                if (inv.customerId !== customerId)
                    return false;

                const paid =
                    Reports.getInvoicePaid(inv.id);

                return paid < M.p(inv.finalTotal);

            })
            .forEach(inv => {

                const paid =
                    Reports.getInvoicePaid(inv.id);

                const remain =
                    M.p(inv.finalTotal) - paid;

                select.innerHTML += `
<option value="${inv.id}">
${inv.id}
 | مانده:
${M.f(remain)}
</option>
`;

            });

    },
    clearCheck(id) {



        const ch = DB.getById("checks", id);
        console.log("ch");

        if (!ch)
            return;

        if (ch.status !== "وصول نشده") {
            return alert("این چک قبلاً تعیین تکلیف شده است.");
        }

        if (!confirm("وصول این چک ثبت شود؟"))
            return;

        const person = DB.getById("customers", ch.customerId);

        if (!person)
            return;

        // ثبت وضعیت وصول
        DB.update("checks", id, {
            status: "وصول شده"
        });

        // چک دریافتی از مشتری
        if (
            person.type === "customer" &&
            ch.type === "دریافتی"
        ) {

            let amount =
                M.p(ch.amount);

            // کم کردن بدهی مشتری

            DB.update("customers", person.id, {

                balance: M.f(

                    Math.max(
                        0,
                        M.p(person.balance) - amount
                    )

                )

            });

            //------------------------------------------------
            // اگر مربوط به فاکتور باشد
            //------------------------------------------------

            if (ch.invoiceId) {

                const invoice =
                    DB.getById("invoices", ch.invoiceId);

                if (invoice) {

                    const paid =
                        Reports.getInvoicePaid(invoice.id);

                    const remain =
                        Math.max(
                            0,
                            M.p(invoice.finalTotal) - paid
                        );

                    DB.update(
                        "invoices",
                        invoice.id,
                        {

                            paid:
                                remain <= 0

                        }
                    );

                    DB.update(
                        "invoices",
                        invoice.id,
                        {

                            paid:
                                remain <= 0

                        }
                    );

                }

            }

        }

        //--------------------------------------------------
        // چک پرداختی به تامین کننده
        //--------------------------------------------------

        if (
            person.type === "supplier" &&
            ch.type === "پرداختی"
        ) {

            //--------------------------------------------------
            // کم شدن طلب فروشنده
            //--------------------------------------------------

            DB.update(
                "customers",
                person.id,
                {

                    balance:
                        M.f(

                            Math.max(
                                0,
                                M.p(person.balance)
                                -
                                M.p(ch.amount)
                            )

                        )

                }
            );

            //--------------------------------------------------
            // بروزرسانی سابقه خرید
            //--------------------------------------------------

            if (ch.purchaseId) {

                const purchase =
                    DB.getById(
                        "purchaseHistory",
                        ch.purchaseId
                    );

                if (purchase) {

                    const newPaid =

                        M.p(purchase.paid)

                        +

                        M.p(ch.amount);

                    const newRemain =

                        Math.max(
                            0,
                            M.p(purchase.total)
                            -
                            newPaid
                        );

                    DB.update(
                        "purchaseHistory",
                        purchase.id,
                        {

                            paid: newPaid,

                            remain: newRemain,

                            paidStatus:
                                newRemain <= 0

                        }

                    );

                }

            }

        }

        Dashboard.render();

        Customers.render();

        PurchaseHistory.render();

        InvoicesList.render();

        Checks.render();

        this.updateAlert();
        this.render();
    },
    renderTable() {
        const tbody = document.getElementById('checks-tbody');
        const checks = DB.get('checks');
        const customers = DB.get('customers');
        tbody.innerHTML = '';

        checks.sort((a, b) => {

            return DateHelper.toTime(a.dueDate) -
                DateHelper.toTime(b.dueDate);

        });

        checks.forEach(ch => {
            const person = customers.find(c => c.id === ch.customerId);
            const pName = person ? person.name : 'نامشخص';

            let badgeClass = 'badge-pending';
            if (ch.status === 'وصول شده') badgeClass = 'badge-success';
            if (ch.status === 'برگشت خورده') badgeClass = 'badge-danger';

            tbody.innerHTML += `
                <tr>
                    <td>${ch.number}</td>
                    <td>${pName}</td>
                    <td>${ch.bank}</td>
                    <td>${ch.type}</td>
                    <td>${ch.dueDate}</td>
                    <td>${ch.reason || "-"}</td>
                    <td>${ch.amount}</td>
                    <td><span class="badge ${badgeClass}">${ch.status}</span></td>
                    <td>
                        ${ch.status === "وصول نشده"
                    ? `<button class="btn btn-sm btn-success"
        onclick="Checks.clearCheck('${ch.id}')"
        style="margin-left:5px;">
        وصول شد
       </button>`
                    : ""
                }
                        <button class="btn btn-sm btn-primary" onclick="Checks.edit('${ch.id}')">ویرایش</button>
                        <button class="btn btn-sm btn-danger" onclick="Checks.remove('${ch.id}')">حذف</button>
                    </td>
                </tr>`;
        });
    },

    updateAlert() {

        const badge =
            document.getElementById("checks-alert");

        if (!badge)
            return;

        const today =
            DateHelper.today();

        const checks =
            DB.get("checks");

        let count = 0;

        checks.forEach(ch => {

            if (
                ch.status === "وصول نشده"
                &&
                (
                    ch.year < today.year
                    ||
                    (
                        ch.year == today.year
                        &&
                        ch.month < today.month
                    )
                    ||
                    (
                        ch.year == today.year
                        &&
                        ch.month == today.month
                        &&
                        ch.day <= today.day
                    )
                )
            ) {

                count++;

            }

        });

        if (count > 0) {

            badge.style.display = "inline-flex";

            badge.textContent = count;

        } else {

            badge.style.display = "none";

        }

    },

    remove(id) {
        if (confirm('حذف این چک؟')) {
            const ch = DB.getById("checks", id);

            if (ch) {

                const person = DB.getById("customers", ch.customerId);

                if (
                    person &&
                    person.type === "supplier" &&
                    ch.type === "پرداختی" &&
                    ch.status === "وصول نشده"
                ) {

                    DB.update("customers", person.id, {
                        balance: M.f(
                            M.p(person.balance) -
                            M.p(ch.amount)
                        )
                    });

                }

            }
            if (ch.invoiceId) {

                const invoice =
                    DB.getById(
                        "invoices",
                        ch.invoiceId
                    );

                if (invoice) {

                    const paid =
                        Reports.getInvoicePaid(invoice.id);

                    DB.update(
                        "invoices",
                        invoice.id,
                        {

                            paid:
                                paid >=
                                M.p(invoice.finalTotal)

                        }
                    );

                }

            }

            DB.delete('checks', id);

            InvoicesList.render();

            Checks.render();
            Dashboard.render();
            Customers.render();
            this.renderTable();
        }
    }
};



const Ledger = {

    init() {

        this.loadPersons();

        document
            .getElementById("ledger-person")
            .addEventListener(
                "change",
                () => this.renderSummary()
            );

    },

    loadPersons() {

        const select =
            document.getElementById("ledger-person");

        select.innerHTML =
            '<option value="">انتخاب شخص...</option>';

        DB.get("customers")
            .forEach(person => {

                const type =

                    person.type === "supplier"

                        ? "فروشنده"

                        : "مشتری";

                select.innerHTML += `

<option value="${person.id}">

${person.name} (${type})

</option>

`;

            });

    },

    renderSummary() {

        const personId =
            document.getElementById("ledger-person").value;

        if (!personId) {

            document
                .getElementById("ledger-summary")
                .style.display = "none";

            return;

        }

        document
            .getElementById("ledger-summary")
            .style.display = "block";

        document
            .getElementById("ledger-table-box")
            .style.display = "block";

        const person =
            DB.getById(
                "customers",
                personId
            );


        if (!person) {
    document.getElementById("ledger-summary").style.display = "none";
    document.getElementById("ledger-table-box").style.display = "none";
    return;
}

document.getElementById("ledger-person-name").textContent =
    person.name || "بدون نام";

document.getElementById("ledger-person-type").textContent =
    person.type === "supplier" ? "فروشنده" : "مشتری";

        //--------------------------------------------------
        // فروشنده
        //--------------------------------------------------

        if (person.type === "supplier") {

            const purchases =
                DB.get("purchaseHistory")
                    .filter(
                        p => p.supplierId === person.id
                    );

            const totalPurchase =
                purchases.reduce(
                    (sum, p) =>
                        sum + M.p(p.total),
                    0
                );

            const totalCash =

                DB.get("cashTransactions")

                    .filter(t =>

                        t.personId === person.id

                        &&

                        t.personType === "supplier"

                    )

                    .reduce(

                        (sum, t) =>

                            sum + M.p(t.amount),

                        0

                    );

            const totalChecks =
                DB.get("checks")
                    .filter(c =>

                        c.customerId === person.id

                        &&

                        c.type === "پرداختی"

                        &&

                        c.status === "وصول شده"

                    )
                    .reduce(
                        (sum, c) =>
                            sum + M.p(c.amount),
                        0
                    );

            const totalPayments =
                totalCash + totalChecks;

            const remain =
                M.p(person.balance);

            document.getElementById("ledger-title-1").textContent =
                "جمع خرید";

            document.getElementById("ledger-title-2").textContent =
                 "جمع پرداخت نقدی";

            document.getElementById("ledger-title-3").textContent =
                "جمع چک های وصول شده";

            document.getElementById("ledger-title-4").textContent =
                "جمع پرداخت های کلی";

            document.getElementById("ledger-title-5").textContent =
                "مانده حساب با فروشنده";

            document.getElementById("ledger-value-1").textContent =
                M.f(totalPurchase);

            document.getElementById("ledger-value-2").textContent =
                M.f(totalCash);

            document.getElementById("ledger-value-3").textContent =
                M.f(totalChecks);

            document.getElementById("ledger-value-4").textContent =
                M.f(totalPayments);

            document.getElementById("ledger-value-5").textContent =
                M.f(remain);

        }

        //--------------------------------------------------
        // مشتری
        //--------------------------------------------------

        else {

            const invoices =
                DB.get("invoices")
                    .filter(
                        i => i.customerId === person.id
                    );

            const totalSell =
                invoices.reduce(
                    (sum, i) =>
                        sum + M.p(i.finalTotal),
                    0
                );

            const totalChecks =
                DB.get("checks")
                    .filter(c =>

                        c.customerId === person.id

                        &&

                        c.type === "دریافتی"

                        &&

                        c.status === "وصول شده"

                    )
                    .reduce(
                        (sum, c) =>
                            sum + M.p(c.amount),
                        0
                    );

            const remain =
                M.p(person.balance);

            document.getElementById("ledger-title-1").textContent =
                "جمع فروش";

            document.getElementById("ledger-title-2").textContent =
                "دریافت نقدی";

            document.getElementById("ledger-title-3").textContent =
                "چک دریافتی وصول شده";

            document.getElementById("ledger-title-4").textContent =
                "جمع دریافت";

            document.getElementById("ledger-title-5").textContent =
                "مانده حساب مشتری";

            document.getElementById("ledger-value-1").textContent =
                M.f(totalSell);

            // مرحله 8.3
            const totalCash =

                DB.get("cashTransactions")

                    .filter(t =>

                        t.personId === person.id

                        &&

                        t.personType === "customer"

                    )

                    .reduce(

                        (sum, t) =>

                            sum + M.p(t.amount),

                        0

                    );

            const totalReceived =

                totalCash +

                totalChecks;

            document.getElementById("ledger-value-2").textContent =
                M.f(totalCash);

            document.getElementById("ledger-value-4").textContent =
                M.f(totalReceived);

            document.getElementById("ledger-value-3").textContent =
                M.f(totalChecks);

            document.getElementById("ledger-value-5").textContent =
                M.f(remain);

        }

        this.renderHistory();

    },

    

renderHistory() {
    const tbody = document.getElementById("ledger-history-tbody");
    const personId = document.getElementById("ledger-person").value;

    tbody.innerHTML = "";

    if (!personId) return;

    const person = DB.getById("customers", personId);
    if (!person) return;

    const isSupplier = person.type === "supplier";
    const rows = [];

    const esc = value =>
        String(value ?? "").replace(/[&<>"']/g, ch => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[ch]);

    const add = (date, timestamp, operation, description, amount, checkInfo = "") => {
        rows.push({
            date: date || "تاریخ ثبت نشده",
            timestamp: Number(timestamp) || DateHelper.toTime(date),
            operation,
            description: description || "شرحی ثبت نشده",
            amount: M.p(amount),
            checkInfo
        });
    };

    // خریدهای ثبت‌شده از فروشنده
    if (isSupplier) {
        DB.get("purchaseHistory")
            .filter(p => p.supplierId === person.id)
            .forEach(p => {
                add(
                    p.date,
                    p.timestamp || p.createdAt,
                    "خرید کالا",
                    `${p.description || `خرید ${p.productName || "کالا"}`} | شماره خرید: ${p.id}`,
                    p.total
                );
            });
    } else {
        // فاکتورهای فروش مشتری
        DB.get("invoices")
            .filter(i => i.customerId === person.id)
            .forEach(i => {
                add(
                    i.date,
                    i.timestamp || i.createdAt,
                    "فروش کالا",
                    `${i.description || "فروش کالا"} | شماره فاکتور: ${i.invoiceNumber || i.id}`,
                    i.finalTotal
                );
            });
    }

    // گردش‌های نقدی
    DB.get("cashTransactions")
        .filter(t =>
            t.personId === person.id &&
            (t.personType || "customer") ===
                (isSupplier ? "supplier" : "customer")
        )
        .forEach(t => {
            const relatedId = isSupplier ? t.purchaseId : t.invoiceId;

            add(
                t.date,
                t.timestamp || t.createdAt,
                isSupplier ? "پرداخت نقدی" : "دریافت نقدی",
                `${t.description || (isSupplier ? "پرداخت به فروشنده" : "دریافت از مشتری")}` +
                    (relatedId ? ` | شماره سند: ${relatedId}` : ""),
                t.amount
            );
        });

    // چک‌ها: وضعیت و شماره چک از اطلاعات واقعی ثبت‌شده
    DB.get("checks")
        .filter(c =>
            c.customerId === person.id &&
            c.type === (isSupplier ? "پرداختی" : "دریافتی")
        )
        .forEach(c => {
            add(
                c.dueDate,
                c.timestamp,
                isSupplier ? "پرداخت چک" : "دریافت چک",
                (() => {
    const invoice = c.invoiceId
        ? DB.getById("invoices", c.invoiceId)
        : null;

    const purchase = c.purchaseId
        ? DB.getById("purchaseHistory", c.purchaseId)
        : null;

    if (isSupplier) {
        const purchaseName = purchase
            ? (purchase.productName || purchase.description || "کالا")
            : "";

        return purchase
            ? `بابت خرید ${purchaseName} | شماره خرید: ${purchase.id}`
            : (c.reason || "پرداخت به فروشنده");
    }

    if (invoice) {
        return `${c.reason ? c.reason + " | " : ""}بابت فاکتور ${invoice.invoiceNumber || invoice.id}`;
    }

    return c.reason || "دریافت از مشتری";
})(),
                c.amount,
                [
                    c.number ? `شماره چک: ${c.number}` : "",
                    c.bank ? `بانک: ${c.bank}` : "",
                    c.status ? `وضعیت: ${c.status}` : ""
                ].filter(Boolean).join(" | ")
            );
        });

    rows.sort((a, b) => a.timestamp - b.timestamp);

    if (!rows.length) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" style="text-align:center;padding:24px;color:#64748b">
                    هنوز عملیاتی برای این شخص ثبت نشده است.
                </td>
            </tr>`;
        return;
    }

    rows.forEach(r => {
        tbody.insertAdjacentHTML("beforeend", `
            <tr>
                <td>${esc(r.date)}</td>
                <td><strong>${esc(r.operation)}</strong></td>
                <td>${esc(r.description)}</td>
                <td style="white-space:nowrap;font-weight:700">
                    ${M.f(Math.abs(r.amount))} تومان
                </td>
                <td style="min-width:180px">
                    ${r.checkInfo
                        ? esc(r.checkInfo)
                        : '<span style="color:#94a3b8">—</span>'}
                </td>
            </tr>
        `);
  
    });
    }
};

const Profits = {


    render() {

        const tbody =
            document.getElementById("profits-tbody");

        tbody.innerHTML = "";

        const profits =
            DB.get("profits");

        profits.sort((a, b) =>
            b.date.localeCompare(a.date)
        );

        profits.forEach(p => {

            tbody.innerHTML += `

            <tr>

                <td>${p.date}</td>

                <td>${p.customerName}</td>

                <td>${p.invoiceId.substr(0, 8)}</td>

                <td>${M.f(p.cost)}</td>

                <td>${M.f(p.sale)}</td>

                <td style="color:green;font-weight:bold;">

                    ${M.f(p.profit)}

                </td>

            </tr>

            `;

        });

    }

};

console.log(

    Reports.getMonthlyReport(1405, 4)

);


    
const Backup = {
    autoKey: "__ramco_backup_last_auto_date",

    today() {
        return DateHelper.today().date.replace(/\//g, "-");
    },

    download(isAutomatic = false) {
        const date = this.today();

        // تمام کلیدها و مقادیر خام localStorage
        const storageData = {};

        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            storageData[key] = localStorage.getItem(key);
        }

        const backup = {
            app: "ramco-localstorage-backup",
            version: 1,
            createdAt: new Date().toISOString(),
            jalaliDate: DateHelper.today().date,
            localStorage: storageData
        };

        const json = JSON.stringify(backup, null, 2);
        const blob = new Blob(
            [json],
            { type: "application/json;charset=utf-8" }
        );

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;

        if (isAutomatic) {
            link.download = `Ramco-Backup-${date}.json`;
        } else {
            const time = new Date()
                .toTimeString()
                .slice(0, 8)
                .replace(/:/g, "-");

            link.download = `Ramco-Backup-${date}-${time}.json`;
        }

        document.body.appendChild(link);
        link.click();
        link.remove();

        setTimeout(() => URL.revokeObjectURL(url), 1000);
    },

    autoDownloadDaily() {
        const today = this.today();

        // اگر امروز قبلاً بک‌آپ خودکار گرفته شده، کاری نکن
        if (localStorage.getItem(this.autoKey) === today) {
            return;
        }

        // تاریخ را پیش از دانلود ثبت کن تا با ورود مجدد
        // در همان روز فایل دیگری دانلود نشود.
        localStorage.setItem(this.autoKey, today);

        this.download(true);
    },

    restore(file) {
        if (!file) {
            alert("لطفاً ابتدا یک فایل JSON انتخاب کن.");
            return;
        }

        const reader = new FileReader();

        reader.onload = () => {
            try {
                const backup = JSON.parse(reader.result);

                if (
                    backup.app !== "ramco-localstorage-backup" ||
                    backup.version !== 1 ||
                    !backup.localStorage ||
                    typeof backup.localStorage !== "object" ||
                    Array.isArray(backup.localStorage)
                ) {
                    throw new Error("Invalid backup format");
                }

                const entries = Object.entries(backup.localStorage);

                if (
                    !entries.every(([key, value]) =>
                        typeof key === "string" &&
                        typeof value === "string"
                    )
                ) {
                    throw new Error("Invalid storage data");
                }

                const confirmed = confirm(
                    "⚠️ آیا مطمئنی می‌خواهی تمام اطلاعات فعلی برنامه " +
                    "با اطلاعات این فایل جایگزین شود؟\n\n" +
                    "این عملیات قابل بازگشت خودکار نیست. " +
                    "پیشنهاد می‌شود ابتدا از اطلاعات فعلی بک‌آپ بگیری."
                );

                if (!confirmed) return;

                // ابتدا داده‌های جدید را اعتبارسنجی کردیم؛
                // سپس اطلاعات فعلی را جایگزین می‌کنیم.
                localStorage.clear();

                for (const [key, value] of entries) {
                    localStorage.setItem(key, value);
                }

                alert("اطلاعات بازیابی شد. برنامه دوباره بارگذاری می‌شود.");
                location.reload();

            } catch (error) {
                console.error("Backup restore error:", error);
                alert(
                    "فایل انتخاب‌شده معتبر نیست یا ساختار آن با بک‌آپ رامکو سازگار نیست."
                );
            }
        };

        reader.onerror = () => {
            alert("خواندن فایل با خطا مواجه شد.");
        };

        reader.readAsText(file, "UTF-8");
    },

    init() {
        document
            .getElementById("btn-backup-download")
            .addEventListener("click", () => this.download(false));

        document
            .getElementById("btn-backup-restore")
            .addEventListener("click", () => {
                const file = document.getElementById("backup-file").files[0];
                this.restore(file);
            });
    }
};

// --- Event Listeners Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    UI.init();
    Backup.init();
Backup.autoDownloadDaily(); 

    document.getElementById('btn-save-product').addEventListener('click', (e) => Products.save(e));
    document.getElementById('btn-save-customer').addEventListener('click', (e) => Customers.save(e));
    document.getElementById('btn-add-row').addEventListener('click', () => InvoiceForm.addRow());
    document.getElementById('calc-discount').addEventListener('input', () => InvoiceForm.calculate());
    document.getElementById('btn-submit-invoice').addEventListener('click', () => InvoiceForm.submit());

    document.getElementById('close-modal').addEventListener('click', () => document.getElementById('payment-modal').classList.remove('show'));
    document.getElementById('btn-confirm-pay').addEventListener('click', () => InvoicesList.confirmPayment());
    document.getElementById('btn-save-worker').addEventListener('click', (e) => Workers.save(e));
    document.getElementById('btn-save-salary').addEventListener('click', (e) => Salaries.save(e));
    document.getElementById('btn-save-check').addEventListener('click', (e) => Checks.save(e));
    document.getElementById("btn-save-expense").addEventListener("click", (e) => Expenses.save(e));
    document
        .getElementById("ch-type")
        .addEventListener(
            "change",
            () => Checks.onTypeChange()
        );
    document.getElementById("ch-customer").addEventListener("change", function () {

        Checks.loadInvoices(this.value);

    });
    document
        .getElementById("ch-type")
        .addEventListener(
            "change",
            () => {

                const customerId =
                    document.getElementById("ch-customer").value;

                if (customerId)
                    Checks.loadInvoices(customerId);

            }
        );
    document
        .getElementById("btn-show-month-report")
        .addEventListener(
            "click",
            () => Reports.showMonthlyReport()
        );

    document
        .getElementById("btn-show-year-report")
        .addEventListener(
            "click",
            () => Reports.showYearlyReport()
        );
    PurchaseHistory.init();
    document
        .getElementById("btn-save-purchase")
        .addEventListener(
            "click",
            () => PurchaseHistory.save()
        );

    document
        .getElementById("purchase-product")
        .addEventListener(
            "change",
            () => Purchases.autoFillProduct()
        );

    document
        .getElementById("purchase-count")
        .addEventListener(
            "input",
            () => Purchases.calculateTotal()
        );

    document
        .getElementById("purchase-price")
        .addEventListener(
            "input",
            () => Purchases.calculateTotal()
        );
    Checks.onTypeChange();
    Ledger.init();
});