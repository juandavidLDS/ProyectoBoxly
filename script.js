function updateSubscriptionFilterCounts() {
    const cards = document.querySelectorAll('.subscription-card');
    const filterButtons = document.querySelectorAll('.filter-pill');
    const totals = {
        all: cards.length,
        active: 0,
        upcoming: 0,
        inactive: 0
    };

    cards.forEach((card) => {
        const status = card.dataset.status;
        if (totals[status] !== undefined) {
            totals[status] += 1;
        }
    });

    filterButtons.forEach((button) => {
        const status = button.dataset.status || 'all';
        const count = totals[status] ?? 0;
        const label = button.textContent.split('(')[0].trim();
        button.innerHTML = `${label} <span>(${count})</span>`;
    });
}

function applySubscriptionFilter(status) {
    const cards = document.querySelectorAll('.subscription-card');
    const filterButtons = document.querySelectorAll('.filter-pill');

    cards.forEach((card) => {
        const matches = status === 'all' || card.dataset.status === status;
        card.style.display = matches ? '' : 'none';
    });

    filterButtons.forEach((button) => {
        button.classList.toggle('active', (button.dataset.status || 'all') === status);
    });
}

window.applySubscriptionFilter = applySubscriptionFilter;

window.updateSubscriptionFilterCounts = updateSubscriptionFilterCounts;

document.addEventListener('DOMContentLoaded', () => {
    const homeTagButtons = document.querySelectorAll('.tag');
    const homeCards = document.querySelectorAll('.card[data-category]');

    if (homeTagButtons.length && homeCards.length) {
        homeTagButtons.forEach((button) => {
            button.addEventListener('click', () => {
                const filter = button.dataset.filter || 'all';

                homeTagButtons.forEach((tag) => {
                    tag.classList.toggle('active', tag === button);
                });

                homeCards.forEach((card) => {
                    const category = card.dataset.category || 'all';
                    const shouldShow = filter === 'all' || category === filter;
                    card.style.display = shouldShow ? '' : 'none';
                });
            });
        });
    }

    const openInvoiceFormButton = document.getElementById('openInvoiceForm');
    const closeInvoiceFormButton = document.getElementById('closeInvoiceForm');
    const addInvoiceForm = document.getElementById('addInvoiceForm');
    const addedInvoicesPanel = document.getElementById('addedInvoicesPanel');
    const addedInvoicesList = document.getElementById('addedInvoicesList');

    if (openInvoiceFormButton && closeInvoiceFormButton && addInvoiceForm &&
        addedInvoicesPanel && addedInvoicesList) {
        const invoiceStorageKey = 'boxlyAddedInvoices';
        const invoiceDateFormatter = new Intl.DateTimeFormat('es-CO', {
            day: 'numeric',
            month: 'long',
            year: 'numeric'
        });
        let addedInvoices = [];
        const invoicesFeedback = document.createElement('p');
        invoicesFeedback.className = 'billing-feedback';
        invoicesFeedback.setAttribute('role', 'status');
        invoicesFeedback.setAttribute('aria-live', 'polite');
        addInvoiceForm.append(invoicesFeedback);

        const setInvoiceFormOpen = (isOpen) => {
            addInvoiceForm.classList.toggle('hidden', !isOpen);
            openInvoiceFormButton.setAttribute('aria-expanded', String(isOpen));
            if (isOpen) {
                addInvoiceForm.querySelector('input[name="subscription"]').focus();
            }
        };

        const renderAddedInvoices = () => {
            addedInvoicesList.replaceChildren();
            addedInvoicesPanel.hidden = addedInvoices.length === 0;

            addedInvoices.forEach((invoice) => {
                const row = document.createElement('article');
                row.className = 'added-invoice-row';

                const details = document.createElement('div');
                details.className = 'added-invoice-details';
                const name = document.createElement('strong');
                name.textContent = invoice.subscription;
                const reference = document.createElement('span');
                reference.textContent = `${invoice.id} · ${invoice.date}`;
                details.append(name, reference);

                const amount = document.createElement('strong');
                amount.className = 'added-invoice-amount';
                amount.textContent = `${new Intl.NumberFormat('es-CO').format(invoice.amount)} COP`;

                const status = document.createElement('span');
                status.className = 'added-invoice-status';
                status.textContent = 'Pre-factura pendiente';

                row.append(details, amount, status);
                addedInvoicesList.append(row);
            });
        };

        try {
            const storedInvoices = JSON.parse(localStorage.getItem(invoiceStorageKey) || '[]');
            if (Array.isArray(storedInvoices)) {
                addedInvoices = storedInvoices.filter((invoice) =>
                    typeof invoice.subscription === 'string' &&
                    Number.isSafeInteger(invoice.amount) &&
                    invoice.amount > 0 &&
                    typeof invoice.id === 'string' &&
                    typeof invoice.date === 'string'
                );
            }
        } catch {
            invoicesFeedback.textContent = 'No se pudieron recuperar las facturas guardadas en este navegador.';
        }

        renderAddedInvoices();

        openInvoiceFormButton.addEventListener('click', () => {
            setInvoiceFormOpen(addInvoiceForm.classList.contains('hidden'));
        });

        closeInvoiceFormButton.addEventListener('click', () => {
            setInvoiceFormOpen(false);
        });

        addInvoiceForm.addEventListener('submit', (event) => {
            event.preventDefault();
            if (!addInvoiceForm.reportValidity()) return;

            const formData = new FormData(addInvoiceForm);
            const subscription = String(formData.get('subscription')).trim();
            const amount = Number(formData.get('amount'));
            if (!subscription || !Number.isSafeInteger(amount) || amount < 1) {
                invoicesFeedback.textContent = 'Ingresa el nombre de la suscripción y un valor válido en pesos.';
                return;
            }

            const invoice = {
                id: `BOX-PRE-${new Date().getFullYear()}-${String(1043 + addedInvoices.length).padStart(4, '0')}`,
                subscription,
                amount,
                date: invoiceDateFormatter.format(new Date())
            };
            addedInvoices.push(invoice);

            try {
                localStorage.setItem(invoiceStorageKey, JSON.stringify(addedInvoices));
                invoicesFeedback.textContent = 'Pre-factura agregada y guardada en este navegador.';
            } catch {
                invoicesFeedback.textContent = 'Pre-factura agregada, pero no se pudo guardar para la próxima visita.';
            }

            renderAddedInvoices();
            addInvoiceForm.reset();
            setInvoiceFormOpen(false);
        });
    }

    const confirmPaymentButton = document.getElementById('confirmPayment');
    const paymentStatus = document.getElementById('paymentStatus');
    const paymentFeedback = document.getElementById('paymentFeedback');
    const shippingStatus = document.getElementById('shippingStatus');
    const trackingNumber = document.getElementById('trackingNumber');
    const deliveryEstimate = document.getElementById('deliveryEstimate');
    const advanceShippingButton = document.getElementById('advanceShipping');
    const trackingSteps = document.querySelectorAll('#trackingTimeline li');
    const paymentOptions = document.querySelectorAll('.payment-option');

    if (confirmPaymentButton && paymentStatus && paymentFeedback && shippingStatus &&
        trackingNumber && deliveryEstimate && advanceShippingButton && trackingSteps.length) {
        const shippingStages = [
            { id: 'preparing', status: 'Preparando tu pedido', action: 'Simular salida a ruta' },
            { id: 'shipped', status: 'En camino', action: 'Simular llegada a tu ciudad' },
            { id: 'out-for-delivery', status: 'En reparto', action: 'Simular entrega' },
            { id: 'delivered', status: 'Entregado', action: 'Envío entregado' }
        ];
        let paid = localStorage.getItem('boxlyBillingPaid') === 'true';
        let stageIndex = 0;

        if (paid) {
            const savedStage = Number(localStorage.getItem('boxlyShippingStage'));
            if (Number.isInteger(savedStage) && savedStage >= 0 && savedStage < shippingStages.length) {
                stageIndex = savedStage;
            }
        }

        const renderBillingState = () => {
            paymentStatus.textContent = paid ? 'Pago confirmado' : 'Pago pendiente';
            paymentStatus.classList.toggle('paid', paid);
            paymentStatus.classList.toggle('pending', !paid);
            confirmPaymentButton.disabled = paid;
            confirmPaymentButton.textContent = paid ? 'Pago confirmado · 120.000 COP' : 'Confirmar pago de 120.000 COP';

            document.querySelectorAll('input[name="payment-method"]').forEach((input) => {
                input.disabled = paid;
            });

            trackingSteps.forEach((step, index) => {
                step.classList.toggle('completed', paid && index < stageIndex);
                step.classList.toggle('current', paid && index === stageIndex);
                if (paid && index === stageIndex) {
                    step.setAttribute('aria-current', 'step');
                } else {
                    step.removeAttribute('aria-current');
                }
            });

            if (!paid) {
                shippingStatus.textContent = 'Esperando el pago';
                trackingNumber.textContent = 'Se asignará al confirmar el pago';
                deliveryEstimate.textContent = 'Pendiente de pago';
                advanceShippingButton.disabled = true;
                advanceShippingButton.textContent = 'Confirma el pago para iniciar el envío';
                return;
            }

            const stage = shippingStages[stageIndex];
            shippingStatus.textContent = stage.status;
            trackingNumber.textContent = 'BX-1042-DEMO';
            deliveryEstimate.textContent = stageIndex === shippingStages.length - 1
                ? 'Entregado'
                : '20 de octubre de 2026';
            advanceShippingButton.disabled = stageIndex === shippingStages.length - 1;
            advanceShippingButton.textContent = stage.action;
        };

        paymentOptions.forEach((option) => {
            const input = option.querySelector('input');
            input.addEventListener('change', () => {
                paymentOptions.forEach((item) => item.classList.toggle('selected', item === option));
            });
            option.classList.toggle('selected', input.checked);
        });

        confirmPaymentButton.addEventListener('click', () => {
            if (paid) return;

            const selectedMethod = document.querySelector('input[name="payment-method"]:checked');
            if (!selectedMethod) {
                paymentFeedback.textContent = 'Selecciona un medio de pago para continuar.';
                return;
            }

            paid = true;
            stageIndex = 0;
            localStorage.setItem('boxlyBillingPaid', 'true');
            localStorage.setItem('boxlyShippingStage', String(stageIndex));
            paymentFeedback.textContent = `Pago de demostración confirmado con ${selectedMethod.value}. No se realizó ningún cobro.`;
            renderBillingState();
        });

        advanceShippingButton.addEventListener('click', () => {
            if (!paid || stageIndex >= shippingStages.length - 1) return;

            stageIndex += 1;
            localStorage.setItem('boxlyShippingStage', String(stageIndex));
            renderBillingState();
        });

        renderBillingState();
    }

    const modal = document.getElementById('subscriptionModal');
    const modalTitle = document.getElementById('modalTitle');
    const modalDescription = document.getElementById('modalDescription');
    const modalPrice = document.getElementById('modalPrice');
    const modalImage = document.getElementById('modalImage');
    const closeButton = document.querySelector('.close-modal');
    const cards = document.querySelectorAll('.subscription-card');
    const detailsButtons = document.querySelectorAll('.details-btn');
    const filterButtons = document.querySelectorAll('.filter-pill');

    updateSubscriptionFilterCounts();
    applySubscriptionFilter('all');

    const openModal = (card) => {
        if (!card || !modal) return;

        const title = card.dataset.title || 'Caja';
        const description = card.dataset.description || 'Sin descripción disponible.';
        const price = card.dataset.price || 'Precio no disponible';
        const image = card.querySelector('img')?.src || '';

        modalTitle.textContent = title;
        modalDescription.textContent = description;
        modalPrice.textContent = price;
        modalImage.src = image;
        modalImage.alt = title;
        modal.classList.remove('hidden');
        modal.setAttribute('aria-hidden', 'false');
    };

    const closeModal = () => {
        if (!modal) return;

        modal.classList.add('hidden');
        modal.setAttribute('aria-hidden', 'true');
    };

    cards.forEach((card) => {
        card.addEventListener('click', (event) => {
            if (event.target.closest('.favorite-btn') || event.target.closest('.details-btn')) {
                return;
            }
            openModal(card);
        });
    });

    detailsButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const card = button.closest('.subscription-card');
            openModal(card);
        });
    });

    if (closeButton) {
        closeButton.addEventListener('click', closeModal);
    }

    if (modal) {
        modal.addEventListener('click', (event) => {
            if (event.target === modal) {
                closeModal();
            }
        });
    }

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && modal && !modal.classList.contains('hidden')) {
            closeModal();
        }
    });

    filterButtons.forEach((button) => {
        button.addEventListener('click', () => {
            const status = button.dataset.status || 'all';
            applySubscriptionFilter(status);
        });
    });

    updateSubscriptionFilterCounts();
    applySubscriptionFilter('all');
});
