/* ======================== 공통 요소 ======================== */
const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");

const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");

const backBtn = document.querySelector(".back-btn");
const password = document.getElementById("password");
const passwordConfirm = document.getElementById("passwordConfirm");
const passwordHelper = document.getElementById("passwordHelper");
const passwordConfirmHelper = document.getElementById("passwordConfirmHelper");
const submitBtn = document.getElementById("submitBtn");

const toast = document.getElementById("toast");
const errorToast = document.getElementById("errorToast");

const userId = localStorage.getItem("userId");

let accessToken = localStorage.getItem("accessToken");

/* ======================== 공통 함수 ======================== */
function showToast() {
    toast.textContent = "수정 완료";
    toast.classList.add("show");
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2000);
}

function showErrorToast(message) {
    errorToast.textContent = message;
    errorToast.classList.remove("hidden");
    errorToast.classList.add("show");

    setTimeout(() => {
        errorToast.classList.remove("show");
        setTimeout(() => errorToast.classList.add("hidden"), 300);
    }, 2500);
}

function handleApiError(result) {
    if (result.status === 400) {
        showErrorToast(result.message);
    }
    else if (result.status === 401) {
        showErrorToast(result.message);
    }
    else if (result.status === 403) {
        showErrorToast(result.message);
    }
    else if (result.status === 404) {
        showErrorToast(result.message);
    }
    else if (result.status === 422) {
        if (result.message) {
            passwordConfirmHelper.textContent = result.message;
        }
        else if (result.errors) {
            result.errors.forEach(err => {
            if (err.field === "password") {
                passwordHelper.textContent = err.message;
            }
            else if (err.field === "password_confirm") {
                passwordConfirmHelper.textContent = err.message;
            }
        });
        }
    }
    else if (result.status === 500) {
        showErrorToast(result.message);
    }
    else {
        showErrorToast("알 수 없는 오류가 발생했습니다.");
    }
}

/* ======================== 토큰 재발급 ======================== */
async function tryRefreshToken() {
    try {
        localStorage.removeItem("accessToken");

        const response = await fetch(`${ENV.API_BASE_URL}/auth/refresh`, {
            method: "POST",
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            handleApiError(result);
        }

        localStorage.setItem("accessToken", result.data.access_token);
        return true;
    } catch (error) {
        showToast("토큰 재발급 실패");
        return false;
  }
}

// ====================== 회원 페이지 ======================
profileDropdownButtons.forEach((btn, index) => {
    btn.addEventListener("click", () => {
        switch (index) {
            case 0: // 회원정보수정
                window.location.href = "/profile";
                break;
            case 1: // 비밀번호수정
                window.location.href = "/password";
                break;
            case 2: // 로그아웃
                showLogoutModal();
                break;
        }
    });
});

function showLogoutModal() {
    logoutModal.classList.remove("hidden");

    cancelLogout.onclick = () => {
        logoutModal.classList.add("hidden");
    };

    confirmLogout.onclick = handleLogout;
}

async function handleLogout() {
    try {
        const result = await fetchLogout();

        if (!result) {
            return;
        }

        finalizeLogout();
    } catch (err) {
        showToast("로그아웃 중 오류가 발생했습니다.");
    }
}

async function fetchLogout() {
    try {
        let response = await fetch(`${ENV.API_BASE_URL}/auth`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: "include",
        });

        if (response.status === 401) {
            const refreshSuccess = await tryRefreshToken();
            if (!refreshSuccess) {
                window.location.href = "/login";
                return;
            }

            accessToken = localStorage.getItem("accessToken");
            response = await fetch(`${ENV.API_BASE_URL}/auth`, {
                method: "DELETE",
                headers: { "Authorization": `Bearer ${accessToken}` },
                credentials: "include",
            });
        }

        const result = await response.json();

        if (!response.ok) {
            logoutModal.classList.add("hidden");
            handleApiError(result);
            return;
        }

        return result;
    } catch (err) {
        return null;
    }
}

function finalizeLogout() {
    localStorage.removeItem("accessToken");
    logoutModal.classList.add("hidden");
    logoutCompleteModal.classList.remove("hidden");

    confirmLogoutComplete.onclick = () => {
        logoutCompleteModal.classList.add("hidden");
        window.location.href = "/login";
    };
}

// ====================== 입력 검증 ======================
// 비밀번호 검증
function validatePassword(input) {

    if (!input.trim()) {
        return "비밀번호를 입력해주세요.";
    }

    const regex = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[!@#$%^&*(),.?":{}|<>])[^\s]{8,20}$/;
    if (!regex.test(input)) {
        return "비밀번호는 8자 이상, 20자 이하이며, 대문자, 소문자, 숫자, 특수문자를 각각 최소 1개 포함해야 합니다.";
    }

    return "";
}

// 비밀번호 확인 검증
function validatePasswordConfirm(input) {

    if (!input.trim()) {
        return "비밀번호를 한번 더 입력해주세요.";
    }

    if (password.value !== passwordConfirm.value) {
      return "비밀번호가 다릅니다.";
    }

    return "";
}

function checkFormValidity() {
    const passwordMsg = validatePassword(password.value);
    const passwordConfirmMsg = validatePasswordConfirm(passwordConfirm.value);

    const allValid = !passwordMsg && !passwordConfirmMsg;
    submitBtn.disabled = !allValid;
    submitBtn.classList.toggle("active", allValid);
}

// ======================== 비밀번호 변경 ========================
async function handleChangePassword() {
    try {
        const result = await fetchChangePassword(userId, password.value, passwordConfirm.value);
        if (!result) {
            return;
        }

        showToast();
    } catch (error) {
        showErrorToast("비밀번호 수정 중 오류가 발생했습니다.");
    }
}

async function fetchChangePassword(userId, passwordValue, passwordConfirmValue) {
    let response = await fetch(`${ENV.API_BASE_URL}/users/${userId}/password`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
            password: passwordValue,
            password_confirm: passwordConfirmValue
        }),
        credentials: "include",
    });

    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
            window.location.href = "/login";
            return;
        }

        accessToken = localStorage.getItem("accessToken");
        response = await fetch(`${ENV.API_BASE_URL}/users/${userId}/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                password: passwordValue,
                password_confirm: passwordConfirmValue
            }),
            credentials: "include",
        });
    }

    const result = await response.json();
    if (!response.ok) {
        handleApiError(result);
        return;
    }

    return result;
}

// ====================== 이벤트 ======================
backBtn.addEventListener("click", () => {
    window.location.href = "/posts";
});

userProfileImg.addEventListener("click", () => {
    profileDropdown.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target) && e.target !== userProfileImg) {
        profileDropdown.classList.add("hidden");
    }
});

password.addEventListener("input", () => {
    const msg = validatePassword(password.value);
    passwordHelper.textContent = msg;
    checkFormValidity();
});

passwordConfirm.addEventListener("input", () => {
    const msg = validatePasswordConfirm(passwordConfirm.value);
    passwordConfirmHelper.textContent = msg;
    checkFormValidity();
});

document.getElementById("changePasswordForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await handleChangePassword();
});

/* ======================== 초기 실행 ======================== */
loadUserProfile();