/**
 * Standalone Wishes Bridge - Google Forms Integration
 * Gửi thông tin lời chúc & xác nhận tham dự (RSVP) trực tiếp lên Google Forms API.
 */
(function (window, document) {
    'use strict';

    var GOOGLE_FORM_URL = 'https://docs.google.com/forms/u/0/d/e/1FAIpQLSf1be8LuRHZtWAJ2xA5ttHyADKLss5hFp2BlwoZabgLP8kwkQ/formResponse';

    var GOOGLE_FORM_FIELDS = {
        name: 'entry.1545481780',
        attendance: 'entry.1272723923',
        guestCount: 'entry.1688750299',
        message: 'entry.573889188'
    };

    var ATTENDANCE_LABELS = {
        attending: 'Sẽ tham dự',
        not_attending: 'Không thể đến',
        unsure: 'Chưa rõ'
    };

    var alertHideTimer = null;

    var StandaloneWishesBridge = {
        init: function () {
            this.hideWishesFeed();
            this.bindForms();
        },

        hideWishesFeed: function () {
            var feedEl = document.querySelector('#wishesFeed, #wishes-list, #gbList, .wishes-feed');
            if (feedEl) {
                feedEl.hidden = true;
                feedEl.style.display = 'none';
            }
        },

        bindForms: function () {
            var self = this;

            window.submitWish = function (e) {
                if (e && e.preventDefault) e.preventDefault();
                var targetForm = (e && e.target && e.target.tagName === 'FORM')
                    ? e.target
                    : document.querySelector('#wishForm, #wish-form, #rsvp-form, #messageForm, #customForm, .form-wedding-wish');
                self.handleFormSubmit(targetForm);
            };

            var forms = document.querySelectorAll('#rsvp-form, #wishForm, #wish-form, #messageForm, #customForm, .form-wedding-wish');
            forms.forEach(function (form) {
                if (form.dataset.wishBound === 'true') return;
                form.dataset.wishBound = 'true';

                form.addEventListener('submit', function (e) {
                    e.preventDefault();
                    self.handleFormSubmit(form);
                });
            });
        },

        showFormAlert: function (form, type, text) {
            var alertEl = form.querySelector('#wishFormAlert, .wish-form-alert');
            if (!alertEl) {
                if (typeof window.showToast === 'function') {
                    window.showToast(text);
                } else {
                    alert(text);
                }
                return;
            }

            if (alertHideTimer) {
                clearTimeout(alertHideTimer);
                alertHideTimer = null;
            }

            // Clear inline display so CSS .success / .error classes control visibility across multiple submits
            alertEl.style.display = '';
            alertEl.textContent = text;
            alertEl.className = 'wish-form-alert ' + type;

            if (type === 'success') {
                alertHideTimer = setTimeout(function () {
                    alertEl.className = 'wish-form-alert';
                    alertEl.textContent = '';
                }, 6000);
            }
        },

        clearFormAlert: function (form) {
            var alertEl = form.querySelector('#wishFormAlert, .wish-form-alert');
            if (!alertEl) return;

            if (alertHideTimer) {
                clearTimeout(alertHideTimer);
                alertHideTimer = null;
            }

            alertEl.style.display = '';
            alertEl.className = 'wish-form-alert';
            alertEl.textContent = '';
        },

        buildFormPayload: function (senderName, attendanceLabel, guestCount, message) {
            var params = new URLSearchParams();
            params.append(GOOGLE_FORM_FIELDS.name, senderName);
            params.append(GOOGLE_FORM_FIELDS.attendance, attendanceLabel);
            params.append(GOOGLE_FORM_FIELDS.guestCount, guestCount);
            params.append(GOOGLE_FORM_FIELDS.message, message);
            return params;
        },

        resetWishForm: function (form, countInput) {
            form.reset();

            var defaultRadio = form.querySelector('input[name="attendance_status"][value="attending"]');
            if (defaultRadio) {
                defaultRadio.checked = true;
                if (typeof window.handleRsvpChange === 'function') {
                    window.handleRsvpChange('attending');
                }
            }

            if (countInput) {
                countInput.value = '1';
            }
        },

        handleFormSubmit: function (form) {
            if (!form || form.dataset.submitting === 'true') return;
            var self = this;

            var nameInput = form.querySelector('#guestNameInput, #rsvp-name, #name, #m_name, #f_name, input[name="sender_name"], input[name="name"], input[type="text"]');
            var wishInput = form.querySelector('#guestWishInput, #rsvp-wish, #messages, #m_text, #f_mess, textarea[name="message"], textarea[name="wish"], textarea');
            var attInput = form.querySelector('input[name="attendance_status"]:checked, input[name="attendance"]:checked, #accept, select[name="attendance_status"], #rsvp-status');
            var countInput = form.querySelector('#guestCountInput, select[name="guest_count"], input[name="guest_count"]');

            var senderName = nameInput ? nameInput.value.trim() : '';
            var message = wishInput ? wishInput.value.trim() : '';

            if (!senderName) {
                self.showFormAlert(form, 'error', 'Vui lòng nhập tên của bạn.');
                if (nameInput) nameInput.focus();
                return;
            }

            if (!message) {
                self.showFormAlert(form, 'error', 'Vui lòng nhập lời chúc mừng hạnh phúc.');
                if (wishInput) wishInput.focus();
                return;
            }

            var rawStatus = attInput ? attInput.value : 'attending';
            var attendanceLabel = ATTENDANCE_LABELS[rawStatus] || rawStatus || 'Sẽ tham dự';
            var guestCount = (rawStatus === 'attending' && countInput && countInput.value)
                ? String(countInput.value).trim()
                : '1';

            var submitBtn = form.querySelector('#wishSubmitBtn, button[type="submit"], input[type="submit"]');
            var origBtnHtml = submitBtn ? submitBtn.innerHTML : '';

            form.dataset.submitting = 'true';
            self.clearFormAlert(form);

            if (submitBtn) {
                submitBtn.disabled = true;
                submitBtn.innerHTML = 'Đang gửi thông tin...';
            }

            var params = self.buildFormPayload(senderName, attendanceLabel, guestCount, message);

            // Google Forms /formResponse does not return CORS headers; no-cors allows the POST to succeed cleanly
            fetch(GOOGLE_FORM_URL, {
                method: 'POST',
                mode: 'no-cors',
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
                },
                body: params.toString()
            })
            .then(function () {
                self.resetWishForm(form, countInput);
                self.showFormAlert(form, 'success', 'Cảm ơn bạn đã gửi lời chúc và xác nhận tham dự! ❤️');
            })
            .catch(function (err) {
                console.error('[GoogleFormsWishes] Submit error:', err);
                self.showFormAlert(form, 'error', 'Không thể gửi lời chúc, vui lòng kiểm tra kết nối mạng và thử lại.');
            })
            .finally(function () {
                form.dataset.submitting = 'false';
                if (submitBtn) {
                    submitBtn.disabled = false;
                    submitBtn.innerHTML = origBtnHtml;
                }
            });
        }
    };

    window.StandaloneWishesBridge = StandaloneWishesBridge;

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            StandaloneWishesBridge.init();
        });
    } else {
        StandaloneWishesBridge.init();
    }
})(window, document);
