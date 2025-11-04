/* ======================== 공통 요소 ======================== */
const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");

const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");

const title = document.getElementById("title");
const content = document.getElementById("content");
const image = document.getElementById("image");
const postHelper = document.getElementById("postHelper");

const submitBtn = document.getElementById("submitBtn");
const backBtn = document.querySelector(".back-btn");

const modal = document.getElementById("editPostModal");
const confirmModal = document.getElementById("confirmModal");
const errorToast = document.getElementById("errorToast");

let accessToken = localStorage.getItem("accessToken");
let postId = window.location.pathname.split("/").pop();

let selectedFiles = [];
let originalImages = [];
let initialTitle = "";
let initialContent = "";
let initialImages = [];

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
    else if (result.status === 403) {
        showToast(result.message);
    }
    else if (result.status === 404) {
        showToast(result.message);
    }
    else if (result.status === 422) {
        if (result.message) {
            postHelper.textContent = "제목, 내용을 모두 작성해주세요."
        }
        if (result.errors) {
            result.errors.forEach(err => {
            if (err.field === "title") {
                postHelper.textContent = err.message;
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

/* ======================== 게시글 검증 ======================== */
function validatePost(title, content) {
    if (!title.trim() || !content.trim()) {
        return "제목, 내용을 모두 작성해주세요.";
    }
}

function checkFormValidity() {
    const postMsg = validatePost(title.value, content.value);
    postHelper.textContent = postMsg;

    const valid = !postMsg || selectedFiles.length > 0 || originalImages.length !== initialImages.length;
    submitBtn.disabled = !valid;
    submitBtn.classList.toggle("active", valid);
}

/* ======================== 게시글 불러오기 ======================== */
async function loadPostData() {
    try {
        const result = await fetchPostEditData();
        if (!result) {
            return;
        }

        title.value = result.data.title;
        content.value = result.data.content;
        originalImages = result.data.images || [];

        initialTitle = result.data.title;
        initialContent = result.data.content;
        initialImages = result.data.images || [];

        renderImageList();
    } catch (error) {
        showToast("게시글 수정 정보를 불러오는 중 오류가 발생했습니다.");
    }
}

async function fetchPostEditData() {
    let response = await fetch(`http://localhost:8080/posts/${postId}/edit`, {
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
        response = await fetch(`http://localhost:8080/posts/${postId}/edit`, {
            method: "GET",
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

/* ======================== 이미지 ======================== */
function renderImageList() {
    const fileListContainer = document.getElementById("fileList") || createFileList();
    fileListContainer.innerHTML = "";

    originalImages.forEach((img, index) => {
        const chip = createChip(`${img.image_name}.${img.extension}`, () => {
            originalImages = originalImages.filter(
                (image) => image.image_url !== img.image_url
            );
            renderImageList();
            checkFormValidity();
        });
        fileListContainer.appendChild(chip);
    });

    selectedFiles.forEach((file, index) => {
        const chip = createChip(file.name, () => {
            selectedFiles.splice(index, 1);
            renderImageList();
            checkFormValidity();
        });
        fileListContainer.appendChild(chip);
    });
}


function createChip(label, onRemove) {
    const chip = document.createElement("div");
    chip.classList.add("file-chip");

    const span = document.createElement("span");
    span.textContent = label;

    const btn = document.createElement("button");
    btn.textContent = "x";
    btn.classList.add("remove-btn");
    btn.addEventListener("click", onRemove);

    chip.appendChild(span);
    chip.appendChild(btn);

    return chip;
}

function createFileList() {
    const div = document.createElement("div");
    div.id = "fileList";
    div.classList.add("file-list");
    image.insertAdjacentElement("afterend", div);

    return div;
}

/* ======================== 이미지 업로드 ======================== */
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


// ====================== 게시글 수정 ======================
async function updatePost() {
    const postTitle = title.value;
    const postContent = content.value;

    const msg = validatePost(postTitle, postContent);
    if (msg) {
        showToast(msg);
        return;
    }

    const isTitleChanged = postTitle !== initialTitle;
    const isContentChanged = postContent !== initialContent;
    const isImageChanged =
        selectedFiles.length > 0 ||
        originalImages.length !== initialImages.length ||
        !originalImages.every((img, idx) =>
            img.image_url === initialImages[idx]?.image_url
        );

    if (!isTitleChanged && !isContentChanged && !isImageChanged) {
        return;
    }

    try {
        let uploaded = [];
        if (selectedFiles.length > 0) {
            uploaded = await uploadImagesToS3(selectedFiles);
        }

        const requestBody = {};
        if (isTitleChanged) {
            requestBody.title = postTitle;
        }
        if (isContentChanged) {
            requestBody.content = postContent;
        }
        if (isImageChanged) {
            const mergedImages = [...originalImages, ...uploaded];
            requestBody.post_images = mergedImages.map(img => ({
                image_url: img.image_url,
                image_name: img.image_name,
                extension: img.extension
            }));
        }

        if (!requestBody.post_images) {
            requestBody.post_images = [];
        }

        const result = await fetchUpdatePost(requestBody);
        if (!result) {
            return;
        }

        modal.classList.remove("hidden");
        confirmModal.onclick = () => {
            modal.classList.add("hidden");
            window.location.href = `/post/${postId}`;
        };
    } catch {
        showToast("게시글 수정 중 오류가 발생했습니다.");
    }
}

async function fetchUpdatePost(body) {
    let response = await fetch(`http://localhost:8080/posts/${postId}`, {
        method: "PATCH",
        headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${accessToken}`,
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
        response = await fetch(`http://localhost:8080/posts/${postId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${accessToken}`,
            },
            body: JSON.stringify(body),
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

/* ======================== 이벤트 ======================== */
backBtn.addEventListener("click", () => {
    window.location.href = `/post/${postId}`;
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

image.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    selectedFiles.push(...newFiles);
    renderImageList();
});

submitBtn.addEventListener("click", updatePost);

/* ======================== 초기 실행 ======================== */
loadUserProfile();
loadPostData();