const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");

const backBtn = document.querySelector(".back-btn");

const password = document.getElementById("password");
const passwordConfirm = document.getElementById("passwordConfirm");

const passwordHelper = document.getElementById("passwordHelper");
const passwordConfirmHelper = document.getElementById("passwordConfirmHelper");

const submitBtn = document.getElementById("submitBtn");

const toast = document.getElementById("toast");

const accessToken = localStorage.getItem("accessToken");
const userId = localStorage.getItem("userId");

const errorToast = document.getElementById("errorToast");

backBtn.addEventListener("click", () => {
    window.location.href = "/posts";
});

async function loadUserProfile() {
    try {
        const response = await fetch("http://localhost:8080/users/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            },
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    accessToken = localStorage.getItem("accessToken");
                    uploadImagesToS3(files);
                }
                else {
                    handleApiError(result);
                    window.location.href = "/login";
                    return;
                }
            }
            else {
                handleApiError(result);
                return;
            }
        }

        if (result.data.profile_image) {
            userProfileImg.src = result.data.profile_image;
        }
        else {
            userProfileImg.src = "../assets/default-profile.png";
        }

    } catch (err) {
        showToast("프로필 사진 업로드 중 오류가 발생했습니다.");
    }
}

userProfileImg.addEventListener("click", () => {
    profileDropdown.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target) && e.target !== userProfileImg) {
        profileDropdown.classList.add("hidden");
    }
});

// 프로필 드롭다운의 각 버튼 클릭 시 페이지 이동
profileDropdownButtons.forEach((btn, index) => {
    btn.addEventListener("click", async () => {
        switch (index) {
            case 0: // 회원정보수정
                window.location.href = "/profile";
                break;
            case 1: // 비밀번호수정
                window.location.reload();
                break;
            case 2: // 로그아웃
                logoutModal.classList.remove("hidden");

                cancelLogout.onclick = () => {
                    logoutModal.classList.add("hidden");
                };
                confirmLogout.onclick = async() => {
                    try {
                        const response = await fetch("http://localhost:8080/auth", {
                            method: "DELETE",
                            headers: {
                                "Authorization": `Bearer ${accessToken}`
                            },
                            credentials: "include",
                        });

                        const result = await response.json();
                        if (!response.ok) {
                            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                                const refreshSuccess = await tryRefreshToken();
                                if (refreshSuccess) {
                                    accessToken = localStorage.getItem("accessToken");

                                    const response = await fetch("http://localhost:8080/auth", {
                                        method: "DELETE",
                                        headers: {
                                            "Authorization": `Bearer ${accessToken}`
                                        },
                                        credentials: "include",
                                    });

                                    const result = await response.json();
                                    if (!response.ok) {
                                        handleApiError(result);
                                        return;
                                    }
                                }
                                else {
                                    handleApiError(result);
                                    window.location.href = "/login";
                                    return;
                                }
                            }
                            else {
                                handleApiError(result);
                                return;
                            }
                        }

                        logoutModal.classList.add("hidden");
                        logoutCompleteModal.classList.remove("hidden");

                        confirmLogoutComplete.onclick = () => {
                            logoutCompleteModal.classList.add("hidden");
                            window.location.href = "/login";
                        };
                    } catch (err) {
                        showErrorToast("로그아웃 중 오류가 발생했습니다.");
                    }
                };
                break;
        }
    });
});

// 토스트 표시 함수
function showToast() {
    toast.textContent = "수정 완료";
    toast.classList.add("show");
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2000);
}

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

// 수정하기 클릭
document.getElementById("changePasswordForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        const response = await fetch(`http://localhost:8080/users/${userId}/password`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                password: password.value,
                password_confirm: passwordConfirm.value
            }),
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    accessToken = localStorage.getItem("accessToken");
                    const response = await fetch(`http://localhost:8080/users/${userId}/password`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({
                            password: password.value,
                            password_confirm: passwordConfirm.value
                        }),
                        credentials: "include",
                    });

                    const result = await response.json();
                    if (!response.ok) {
                        handleApiError(result);
                        return;
                    }
                }
                else {
                    handleApiError(result);
                    window.location.href = "/login";
                    return;
                }
            }
            else {
                handleApiError(result);
                return;
            }
        }

        showToast();
    } catch (error) {
        showErrorToast("비밀번호 수정 중 오류가 발생했습니다.");
    }
});

async function tryRefreshToken() {
    try {
        localStorage.removeItem("accessToken");

        const response = await fetch("http://localhost:8080/auth/refresh", {
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

function handleApiError(result) {
    if (result.status === 400) {
        showToast(result.message);
    }
    else if (result.status === 401) {
        showToast(result.message);
    }
    else if (result.status === 403) {
        showToast(result.message);
    }
    else if (result.status === 404) {
        showToast(result.message);
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
        showToast(result.message);
    }
    else {
        showToast("알 수 없는 오류가 발생했습니다.");
    }
}

loadUserProfile();