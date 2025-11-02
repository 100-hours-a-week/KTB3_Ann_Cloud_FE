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
// 이미지 파일 선택 및 표시
let selectedFiles = [];

function showToast(message) {
    errorToast.textContent = message;
    errorToast.classList.remove("hidden");
    errorToast.classList.add("show");

    setTimeout(() => {
        errorToast.classList.remove("show");
        setTimeout(() => errorToast.classList.add("hidden"), 300);
    }, 2500);
}

backBtn.addEventListener("click", () => {s
    window.location.href = "/posts";
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

    const valid = !postMsg;
    submitBtn.disabled = !valid;
    submitBtn.classList.toggle("active", valid);
}

title.addEventListener("input", checkFormValidity);
content.addEventListener("input", checkFormValidity);

image.addEventListener("change", (e) => {
    const newFiles = Array.from(e.target.files);
    selectedFiles = [
        ...selectedFiles,
        ...newFiles.filter(
            newFile => !selectedFiles.some(file => file.name === newFile.name && file.size === newFile.size)
        )
    ];
    renderFileList();

    const fileLabel = image.nextElementSibling;
    if (fileLabel && fileLabel.tagName === "P") {
        fileLabel.textContent = selectedFiles.length > 0
            ? ""
            : "파일을 선택해주세요.";
    }
});

// 파일 목록 렌더링
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

// 이미지 S3 URL 받기
async function uploadImagesToS3(files) {
    if (!files.length) {
        return [];
    }

    const formData = new FormData();
    files.forEach(file => formData.append("files", file));

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

    } catch (error) {
        showToast("이미지 업로드 중 오류가 발생했습니다.");
        return;
    }
}

// 게시글 추가
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

        const response = await fetch("http://localhost:8080/posts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({
                title: postTitle,
                content: postContent,
                post_images: imageInfos,
            }),
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    accessToken = localStorage.getItem("accessToken");
                    const response = await fetch("http://localhost:8080/posts", {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({
                            title: postTitle,
                            content: postContent,
                            post_images: imageInfos,
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

        modal.classList.remove("hidden");

        confirmModal.onclick = () => {
            modal.classList.add("hidden");
            window.location.href = "/posts";
        };
    } catch (err) {
        showToast("게시글 등록 중 오류가 발생했습니다.");
    }
}

submitBtn.addEventListener("click", addPost);

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

loadUserProfile();