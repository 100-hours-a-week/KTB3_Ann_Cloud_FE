/* ======================== 공통 요소 ======================== */
const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");

const title = document.getElementById("title");
const content = document.getElementById("content");
const image = document.getElementById("image");
const submitBtn = document.getElementById("submitBtn");
const postForm = document.getElementById("postForm");

const postHelper = document.getElementById("postHelper");

const modal = document.getElementById("writePostModal");
const confirmModal = document.getElementById("confirmModal");
const backBtn = document.querySelector(".back-btn");
const errorToast = document.getElementById("errorToast");

let accessToken = localStorage.getItem("accessToken");
let selectedFiles = [];

/* ======================== 공통 함수 ======================== */
function showToast(message) {
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
        showToast(result.message);
    }
    else if (result.status === 401) {
        showToast(result.message);
    }
    else if (result.status === 422) {
        result.errors.forEach(err => {
            if (err.field === "title") {
                postHelper.textContent = err.message;
            } 
            else if (err.field === "content") {
                postHelper.textContent = err.message;
            }
        });
    }
    else if (result.status === 500) {
        showToast(result.message);
    }
    else {
        showToast("알 수 없는 오류가 발생했습니다.");
    }
}

/* ======================== 토큰 재발급 ======================== */
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
            return false;
        }

        localStorage.setItem("accessToken", result.data.access_token);
        return true;
    } catch (error) {
        showToast("토큰 재발급 실패");
        return false;
  }
}

// ====================== 프로필 ======================
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
    let response = await fetch("http://localhost:8080/users/me", {
        method: "GET",
        headers: { "Authorization": `Bearer ${accessToken}` },
        credentials: "include",
    });

    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
            window.location.href = "/login";
            return;
        }

        accessToken = localStorage.getItem("accessToken");
        response = await fetch("http://localhost:8080/users/me", {
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
        let response = await fetch("http://localhost:8080/auth", {
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
            response = await fetch("http://localhost:8080/auth", {
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
function validatePost(title, content) {
    if (!title.trim() || !content.trim()) {
        return "제목, 내용을 모두 작성해주세요.";
    }
}

function checkFormValidity() {
    const postMsg = validatePost(title.value, content.value);
    postHelper.textContent = postMsg;

    const valid = !postMsg;
    submitBtn.disabled = !valid;
    submitBtn.classList.toggle("active", valid);
}

// ====================== 파일 업로드 ======================
image.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    selectedFiles = [
        ...selectedFiles,
        ...newFiles.filter(
            newFile => !selectedFiles.some(file => file.name === newFile.name && file.size === newFile.size)
        )
    ];
    renderFileList();
});


function renderFileList() {
    let fileListContainer = document.getElementById("fileList");

    if (!fileListContainer) {
        fileListContainer = document.createElement("div");
        fileListContainer.id = "fileList";
        fileListContainer.classList.add("file-list");
        image.insertAdjacentElement("afterend", fileListContainer);
    }

    fileListContainer.innerHTML = "";

    selectedFiles.forEach((file, index) => {
        const chip = document.createElement("div");
        chip.classList.add("file-chip");

        const name = document.createElement("span");
        name.textContent = file.name;

        const removeBtn = document.createElement("button");
        removeBtn.textContent = "x";
        removeBtn.classList.add("remove-btn");
        removeBtn.addEventListener("click", () => {
            selectedFiles.splice(index, 1);
            renderFileList();
        });

        chip.appendChild(name);
        chip.appendChild(removeBtn);
        fileListContainer.appendChild(chip);
    });
}

// ====================== 이미지 S3 업로드 ======================
async function uploadImagesToS3(files) {
    if (!files.length) {
        return [];
    }

    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

    try {
        let result = await requestImageUpload(formData);

        if (!result) {
            return [];
        }

        return files.map((file, idx) => {
            const url = result.data.images[idx];
            const dotIndex = file.name.lastIndexOf(".");
            return {
                image_url: url,
                image_name: dotIndex !== -1 ? file.name.substring(0, dotIndex) : file.name,
                extension: dotIndex !== -1 ? file.name.substring(dotIndex + 1) : "",
            };
        });

    } catch {
        showToast("이미지 업로드 중 오류가 발생했습니다.");
        return [];
    }
}

async function requestImageUpload(formData) {

    let response = await fetch("http://localhost:8080/images", {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
    });

    if (response.status === 401) {
        const refreshed = await tryRefreshToken();
        if (!refreshed) {
            window.location.href = "/login";
            return;
        }

        accessToken = localStorage.getItem("accessToken");
        response = await fetch("http://localhost:8080/images", {
            method: "POST",
            headers: { Authorization: `Bearer ${accessToken}` },
            body: formData,
        });
    }
    
    const result = await response.json();
    if (!response.ok) {
        handleApiError(result);
        return;
    }

    return result;
}

// ====================== 게시글 등록 ======================
async function addPost() {
    const postTitle = title.value;
    const postContent = content.value;

    if (!postTitle || !postContent) {
        showToast("제목, 내용을 모두 작성해주세요.");
        return;
    }

    try {
        let imageInfos = [];

        if (selectedFiles.length > 0) {
            imageInfos = await uploadImagesToS3(selectedFiles);
        }

        const result = await requestAddPost(postTitle, postContent, imageInfos);

        if (!result) {
            return;
        }

        modal.classList.remove("hidden");
        confirmModal.onclick = () => {
            modal.classList.add("hidden");
            window.location.href = "/posts";
        };
    } catch {
        showToast("게시글 등록 중 오류가 발생했습니다.");
    }
}

async function requestAddPost(title, content, imageInfos) {
    let response = await fetch("http://localhost:8080/posts", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({
            title,
            content,
            post_images: imageInfos,
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
        response = await fetch("http://localhost:8080/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
                title,
                content,
                post_images: imageInfos,
            }),
            credentials: "include",
        });
    }

    const result = await response.json();
    if (!response.ok) {
        handleApiError(result);
        return null;
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

title.addEventListener("input", checkFormValidity);
content.addEventListener("input", checkFormValidity);

submitBtn.addEventListener("click", addPost);

// ====================== 초기 실행 ======================
loadUserProfile();