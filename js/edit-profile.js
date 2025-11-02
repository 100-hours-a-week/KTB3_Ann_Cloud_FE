const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");

const backBtn = document.querySelector(".back-btn");

const nickname = document.getElementById("nickname");
const nicknameHelper = document.getElementById("nicknameHelper");
const updateBtn = document.getElementById("updateBtn");
const signoutBtn = document.getElementById("signoutBtn");

const toast = document.getElementById("toast");

const signoutModal = document.getElementById("signoutModal");
const signoutCompleteModal = document.getElementById("signoutCompleteModal");
const cancelSignout = document.getElementById("cancelSignout");
const confirmSignout = document.getElementById("confirmSignout");
const confirmSignoutComplete = document.getElementById("confirmSignoutComplete");

const userId = localStorage.getItem("userId");

const errorToast = document.getElementById("errorToast");

let selectedFile = null;

let initialProfileImage = "";
let initialNickname = "";
let accessToken = localStorage.getItem("accessToken");

function showErrorToast(message) {
    errorToast.textContent = message;
    errorToast.classList.remove("hidden");
    errorToast.classList.add("show");

    setTimeout(() => {
        errorToast.classList.remove("show");
        setTimeout(() => errorToast.classList.add("hidden"), 300);
    }, 2500);
}

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
                    loadUserProfile();
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
        showErrorToast("프로필 사진 업로드 중 오류가 발생했습니다.");
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
                window.location.reload();
                break;
            case 1: // 비밀번호수정
                window.location.href = "/password";
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

// 토스트 표시
function showToast() {
    toast.textContent = "수정 완료";
    toast.classList.add("show");
    toast.classList.remove("hidden");

    setTimeout(() => {
        toast.classList.remove("show");
        toast.classList.add("hidden");
    }, 2000);
}

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

nickname.addEventListener("input", () => {
    const msg = validateNickname(nickname.value);
    nicknameHelper.textContent = msg;
    checkFormValidity();
});

// 프로필 이미지 업로드
const profileImg = document.getElementById("profileImg");
const profilePreview = document.getElementById("profilePreview");
const changeProfileBtn = document.getElementById("changeProfileBtn");
const profileInput = document.getElementById("profileInput");


profileImg.addEventListener("click", () => profileInput.click());

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

// S3 업로드 함수=
async function uploadImageToS3(file) {
    const formData = new FormData();
    formData.append("files", file);

    try {
        const response = await fetch("http://localhost:8080/images", {
            method: "POST",
            body: formData,
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

        return result.data.images[0];
    } catch (error) {
        showErrorToast("이미지 업로드 중 오류가 발생했습니다.");
        return null;
    }
}

// 사용자 정보 불러오기
async function loadUserData() {
    try {
        const response = await fetch(`http://localhost:8080/users/${userId}`, {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`
            },
            credentials: "include",
        });

        const result = await response.json();
        if (!response) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    accessToken = localStorage.getItem("accessToken");
                    loadUserData();
                }
                else {
                    handleApiError(result);
                    window.location.href = "/login";
                    return;
                }
            }
            else {
                handleApiError(result);
                window.location.href = "/posts";
                return;
            }
        }
        const user = result.data;

        email.textContent = user.email;
        nickname.value = user.nickname;
        profilePreview.src = user.profile_image || "../assets/default-profile.png";

        initialProfileImage = user.profile_image;
        initialNickname = user.nickname;
    } catch (error) {
        showErrorToast("회원 정보 업로드 중 오류가 발생했습니다.");
        window.location.href = "/posts";
    }
}

// 회원정보 수정
document.getElementById("editProfileForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        let imageUrl = initialProfileImage;
        let isImageChanged = false;

        if (selectedFile) {
            uploadedUrl = await uploadImageToS3(selectedFile);
            if (uploadedUrl && uploadedUrl !== imageUrl) {
                imageUrl = uploadedUrl;
                isImageChanged = true;
            }
        }

        const isNicknameChanged = nickname.value !== initialNickname;

        if (!isNicknameChanged && !isImageChanged) {
            showToast();
            return;
        }

        const requestBody = {};
        if (isNicknameChanged) {
            requestBody.nickname = nickname.value;
        }
        if (isImageChanged) {
            requestBody.profile_image = imageUrl;
        }

        const response = await fetch(`http://localhost:8080/users/${userId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify(requestBody),
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    accessToken = localStorage.getItem("accessToken");
                    const response = await fetch(`http://localhost:8080/users/${userId}`, {
                        method: "PATCH",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${accessToken}`
                        },
                        body: JSON.stringify(requestBody),
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
        showErrorToast("회원정보 수정 중 오류가 발생했습니다.");
    }
});

// 회원탈퇴
signoutBtn.addEventListener("click", () => {
    signoutModal.classList.remove("hidden");
});

cancelSignout.addEventListener("click", () => {
    signoutModal.classList.add("hidden");
});

confirmSignout.addEventListener("click", async () => {
    try {
        const response = await fetch(`http://localhost:8080/users/${userId}`, {
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
                    const response = await fetch(`http://localhost:8080/users/${userId}`, {
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

        localStorage.removeItem("accessToken");

        signoutModal.classList.add("hidden");
        signoutCompleteModal.classList.remove("hidden");
    } catch (error) {
        showErrorToast("회원탈퇴 중 오류가 발생했습니다.");
    }
});

confirmSignoutComplete.addEventListener("click", () => {
    signoutCompleteModal.classList.add("hidden");
    window.location.href = "/login";
});

function handleApiError(result) {
    if (result.status === 400) {
        showErrorToast(result.message);
    }
    else if (result.status === 401) {
        showErrorToast(result.message);
    }
    else if (result.status === 404) {
        showErrorToast(result.message);
    }
    else if (result.status === 500) {
        showErrorToast(result.message);
    }
    else {
        showErrorToast("알 수 없는 오류가 발생했습니다.");
    }
}

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

loadUserProfile();
loadUserData();