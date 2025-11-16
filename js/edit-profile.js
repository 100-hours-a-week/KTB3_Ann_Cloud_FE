import ENV from "./env.js";

/* ======================== 공통 요소 ======================== */
const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");

const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");

const signoutModal = document.getElementById("signoutModal");
const signoutCompleteModal = document.getElementById("signoutCompleteModal");
const cancelSignout = document.getElementById("cancelSignout");
const confirmSignout = document.getElementById("confirmSignout");
const confirmSignoutComplete = document.getElementById("confirmSignoutComplete");

const nickname = document.getElementById("nickname");
const nicknameHelper = document.getElementById("nicknameHelper");
const updateBtn = document.getElementById("updateBtn");
const signoutBtn = document.getElementById("signoutBtn");
const backBtn = document.querySelector(".back-btn");

const profileImg = document.getElementById("profileImg");
const profilePreview = document.getElementById("profilePreview");
const profileInput = document.getElementById("profileInput");

const toast = document.getElementById("toast");
const errorToast = document.getElementById("errorToast");

const userId = localStorage.getItem("userId");

let accessToken = localStorage.getItem("accessToken");
let selectedFile = null;
let initialProfileImage = "";
let initialNickname = "";

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
    else if (result.status === 409) {
        showErrorToast(result.message);
    }
    else if (result.status === 422) {
        result.errors.forEach(err => {
            if (err.field === "nickname") {
                nicknameHelper.textContent = err.message;
            }
        });
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

/* ======================== 프로필 ======================== */
async function loadUserProfile() {
    try {
        let result = await fetchUserProfile();

        if (result.data?.profile_image) {
            userProfileImg.src = result.data.profile_image;
        } else {
            userProfileImg.src = "../assets/default-profile.png";
        }
    } catch (err) {
        showToast("프로필 정보를 불러오는 중 오류가 발생했습니다.");
    }
}

async function fetchUserProfile() {
    let response = await fetch(`${ENV.API_BASE_URL}/users/me`, {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` },
        credentials: "include",
    });

    if (response.status === 401) {
        const refreshSuccess = await tryRefreshToken();
        if (!refreshSuccess) {
            window.location.href = "/login";
            return;
        }

        accessToken = localStorage.getItem("accessToken");
        response = await fetch(`${ENV.API_BASE_URL}/users/me`, {
            method: "GET",
            headers: { "Authorization": `Bearer ${accessToken}` },
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
            headers: { "Authorization": `Bearer ${accessToken}` },
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
                headers: { Authorization: `Bearer ${accessToken}` },
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
    localStorage.removeItem("userId");
    logoutModal.classList.add("hidden");
    logoutCompleteModal.classList.remove("hidden");

    confirmLogoutComplete.onclick = () => {
        logoutCompleteModal.classList.add("hidden");
        window.location.href = "/login";
    };
}

// ====================== 이미지 S3 업로드 ======================
async function uploadImageToS3(file) {
    const formData = new FormData();
    formData.append("image", file);

    try {
        const response = await fetch("https://jg722jkjml.execute-api.ap-northeast-2.amazonaws.com/dev/images", {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
            handleApiError(result);
        }

        const imageUrl = result.data.files[0].file_url;

        return imageUrl;

    } catch (error) {
        showToast("이미지 업로드 중 오류가 발생했습니다.")
        return null;
    }
}

// ====================== 입력 검증 ======================
// 닉네임 검증
function validateNickname(input) {

    if (!input.trim()) {
        return "닉네임을 입력해주세요.";
    }

    const regex = /^(?!.*\s).+$/;
    if (!regex.test(input)) {
        return "띄어쓰기를 없애주세요.";
    }

    return "";
}

function checkFormValidity() {
    const msg = validateNickname(nickname.value);
    nicknameHelper.textContent = msg;

    const valid = !msg;
    updateBtn.disabled = !valid;
    updateBtn.classList.toggle("active", valid);
}

/* ======================== 사용자 정보 불러오기 ======================== */
async function loadUserData() {
    try {
        const user = await fetchUserData(userId);
        if (!user) {
            return;
        }

        email.textContent = user.email;
        nickname.value = user.nickname;
        profilePreview.src = user.profile_image || "../assets/default-profile.png";

        initialProfileImage = user.profile_image;
        initialNickname = user.nickname;
    } catch (error) {
        showErrorToast("회원 정보 불러오는 중 오류가 발생했습니다.");
        window.location.href = "/posts";
    }
}

async function fetchUserData(userId) {
    let response = await fetch(`${ENV.API_BASE_URL}/users/${userId}`, {
        method: "GET",
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
    });

    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
            window.location.href = "/login";
            return;
        }

        accessToken = localStorage.getItem("accessToken");
        response = await fetch(`${ENV.API_BASE_URL}/users/${userId}`, {
            method: "GET",
            headers: { Authorization: `Bearer ${accessToken}` },
            credentials: "include",
        });
    }

    const result = await response.json();
    if (!response.ok) {
        handleApiError(result);
        window.location.href = "/posts";
        return;
    }

    return result.data;
}

/* ======================== 회원정보 수정 ======================== */
async function updateUserProfile() {
    try {
        let imageUrl = initialProfileImage;
        let isImageChanged = false;

        if (selectedFile) {
            const uploadedUrl = await uploadImageToS3(selectedFile);
            if (uploadedUrl && uploadedUrl !== imageUrl) {
                imageUrl = uploadedUrl;
                isImageChanged = true;
            }
        }

        const isNicknameChanged = nickname.value !== initialNickname;

        if (!isNicknameChanged && !isImageChanged) {
            showErrorToast("변경된 내용이 없습니다.");
            return;
        }

        const requestBody = {};
        if (isNicknameChanged) {
            requestBody.nickname = nickname.value;
        }
        if (isImageChanged) {
            requestBody.profile_image = imageUrl;
        }

        const result = await fetchUpdateUser(userId, requestBody);
        if (!result) {
            return;
        }

        initialNickname = nickname.value;
        initialProfileImage = imageUrl;

        showToast();
    } catch (error) {
        showErrorToast("회원정보 수정 중 오류가 발생했습니다.");
    }
}

async function fetchUpdateUser(userId, body) {
    let response = await fetch(`${ENV.API_BASE_URL}/users/${userId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(body),
        credentials: "include",
    });

    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
            window.location.href = "/login";
            return;
        }

        accessToken = localStorage.getItem("accessToken");
        response = await fetch(`${ENV.API_BASE_URL}/users/${userId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`
            },
            body: JSON.stringify(body),
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

/* ======================== 회원 탈퇴 ======================== */
async function handleSignout() {
    try {
        const result = await fetchDeleteUser(userId);
        if (!result) {
            return;
        }

        localStorage.removeItem("accessToken");

        signoutModal.classList.add("hidden");
        signoutCompleteModal.classList.remove("hidden");
    } catch (error) {
        showErrorToast("회원탈퇴 중 오류가 발생했습니다.");
    }
}

async function fetchDeleteUser(userId) {
    let response = await fetch(`${ENV.API_BASE_URL}/users/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${accessToken}` },
        credentials: "include",
    });

    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
            window.location.href = "/login";
            return;
        }

        accessToken = localStorage.getItem("accessToken");
        response = await fetch(`${ENV.API_BASE_URL}/users/${userId}`, {
            method: "DELETE",
            headers: { Authorization: `Bearer ${accessToken}` },
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

profileInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (!file) {
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        profilePreview.src = event.target.result;
    };
    reader.readAsDataURL(file);

    selectedFile = file;
    checkFormValidity();
});

profileImg.addEventListener("click", () => profileInput.click());

nickname.addEventListener("input", () => {
    const msg = validateNickname(nickname.value);
    nicknameHelper.textContent = msg;
    checkFormValidity();
});

document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    await updateUserProfile();
});

// 회원탈퇴
confirmSignout.addEventListener("click", handleSignout);

signoutBtn.addEventListener("click", () => {
    signoutModal.classList.remove("hidden");
});

cancelSignout.addEventListener("click", () => {
    signoutModal.classList.add("hidden");
});

confirmSignoutComplete.addEventListener("click", () => {
    signoutCompleteModal.classList.add("hidden");
    window.location.href = "/login";
});

/* ======================== 초기 실행 ======================== */
loadUserProfile();
loadUserData();