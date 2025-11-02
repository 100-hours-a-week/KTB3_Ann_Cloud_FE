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
const backBtn = document.querySelector(".back-btn");

const modal = document.getElementById("writePostModal");
const confirmModal = document.getElementById("confirmModal");

const accessToken = localStorage.getItem("accessToken");

const errorToast = document.getElementById("errorToast");

let selectedFiles = [];
let originalImages = [];
let postId = null;

let initialTitle = "";
let initialContent = "";
let initialImages = [];

// URL에서 postId 가져오기
postId = window.location.pathname.split("/").pop();

function showToast(message) {
    errorToast.textContent = message;
    errorToast.classList.remove("hidden");
    errorToast.classList.add("show");

    setTimeout(() => {
        errorToast.classList.remove("show");
        setTimeout(() => errorToast.classList.add("hidden"), 300);
    }, 2500);
}

backBtn.addEventListener("click", () => {
    window.location.href = `/post/${postId}`;
});

async function loadUserProfile() {
    try {
        const response = await fetch("http://localhost:8080/users/me", {
            method: "GET",
            headers: {
                "Authorization": `Bearer ${accessToken}`,
            },
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    console.log("refresh success");
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
                        showToast("로그아웃 중 오류가 발생했습니다.");
                    }
                };
                break;
        }
    });
});

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

title.addEventListener("input", checkFormValidity);
content.addEventListener("input", checkFormValidity);

// 기존 게시글 불러오기
async function loadPostData() {
    try {
        const response = await fetch(`http://localhost:8080/posts/${postId}/edit`, {
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
                    loadPostData();
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

        title.value = result.data.title;
        content.value = result.data.content;
        originalImages = result.data.images || [];

        initialTitle = result.data.title;
        initialContent = result.data.content;
        initialImages = result.data.images || [];

        renderImageList();
    } catch (err) {
        showToast("게시글 수정 정보를 불러오지 못했습니다.");
    }
}

// 기존 이미지 표시
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

// 이미지 선택 시 추가
image.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    selectedFiles.push(...newFiles);
    renderImageList();
});

// S3 업로드
async function uploadImagesToS3(files) {
    if (!files.length) {
        return [];
    }
    const formData = new FormData();
    files.forEach((file) => formData.append("files", file));

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

        return result.data.images.map((url, idx) => {
            const file = files[idx];
            const fullName = file.name;
            const dotIndex = fullName.lastIndexOf(".");
            const name = dotIndex !== -1 ? fullName.substring(0, dotIndex) : fullName;
            const extension = dotIndex !== -1 ? fullName.substring(dotIndex + 1) : "";

            return {
                image_url: url,
                image_name: name,
                extension: extension,
            };
        });
    } catch (err) {
        alert("이미지 업로드 중 오류 발생");
        return [];
    }
}

// 게시글 수정
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
        modal.classList.remove("hidden");
        confirmModal.onclick = () => {
            modal.classList.add("hidden");
            window.location.href = `/post/${postId}`;
        };
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
        
        const response = await fetch(`http://localhost:8080/posts/${postId}`, {
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
                    const response = await fetch(`http://localhost:8080/posts/${postId}`, {
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
                    return;s
                }
            }
            else {
                handleApiError(result);
                return;
            }
        }

        modal.classList.remove("hidden");
        confirmModal.onclick = () => {
            modal.classList.add("hidden");
            window.location.href = `/post/${postId}`;
        };

    } catch (err) {
        showToast("게시글 수정 중 오류가 발생했습니다.");
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

submitBtn.addEventListener("click", updatePost);

loadUserProfile();
loadPostData();