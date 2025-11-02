const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");

const backBtn = document.querySelector(".back-btn");

const wrapper = document.querySelector(".swiper-wrapper");
const imageContainer = document.querySelector(".image-container");

const postTitle = document.querySelector(".post-title");
const profileImage = document.querySelector(".profile-image");
const author = document.querySelector(".author");
const date = document.querySelector(".date");
const content = document.querySelector(".content");
const likeBtn = document.querySelector(".like-btn");
const viewsCount = document.querySelector(".views-count");
const commentsCount = document.querySelector(".comments-count");

const editBtn = document.querySelector(".edit-btn");
const deleteBtn = document.querySelector(".delete-btn");

const postDeleteModal = document.getElementById("postDeleteModal");
const postDeleteCompleteModal = document.getElementById("postDeleteCompleteModal");
const confirmPostDelete = postDeleteModal.querySelector("#confirmDelete");
const cancelPostDelete = postDeleteModal.querySelector("#cancelDelete");
const postDeleteCompleteBtn = postDeleteCompleteModal.querySelector("#postDeleteComplete");

const commentInput = document.getElementById("commentInput");
const submitComment = document.getElementById("submitComment");

const commentDeleteModal = document.getElementById("commentDeleteModal");
const commentDeleteCompleteModal = document.getElementById("commentDeleteCompleteModal");
const confirmCommentDelete = commentDeleteModal.querySelector("#confirmDelete");
const cancelCommentDelete = commentDeleteModal.querySelector("#cancelDelete");
const commentDeleteCompleteBtn = commentDeleteCompleteModal.querySelector("#commentDeleteComplete");

const commentList = document.getElementById("commentList");

const errorToast = document.getElementById("errorToast");

let postId = null;
let isLiked = false;
let likeId = null;
let commentId = null;
let targetCommentElement = null;
let lastCommentCreatedAt = null;
let lastCommentId = null;
let isLoading = false;
let accessToken = localStorage.getItem("accessToken");

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

// 게시글 데이터 요청
async function fetchPostData(postId) {
    const response = await fetch(`http://localhost:8080/posts/${postId}`, {
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
                fetchPostData(postId);
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
    };
    return result.data;
}

// 게시글 렌더링
function renderPost(post) {
    postTitle.textContent = post.title;
    author.textContent = post.nickname;
    date.textContent = post.created_at?.replace("T", " ");
    content.textContent = post.content;

    isLiked = post.liked;
    updateLikeButtonUI(isLiked, post.like_count);

    viewsCount.innerHTML = `
        <strong>${post.view_count}</strong>
        <span>조회수</span>
    `;
    commentsCount.innerHTML = `
        <strong>${post.comment_count}</strong>
        <span>댓글</span>
    `;

    if (post.profile_image) {
        profileImage.src = post.profile_image;
    }
    else {
        profileImage.src = "../assets/default-profile.png";
    }
  
    if (post.images != null) {
        renderImages(post.images);
    }
}

// 이미지 렌더링
function renderImages(images = []) {
    if (!wrapper || !imageContainer) {
        return;
    }

    wrapper.innerHTML = "";

    if (images.length === 0) {
        imageContainer.style.display = "none";
        return;
    }
    else {
        imageContainer.style.display = "block";
    }

    images
        .sort((a, b) => a.orderNum - b.orderNum)
        .forEach((img) => {
            const slide = document.createElement("div");
            slide.classList.add("swiper-slide");

            const imageEl = document.createElement("img");
            imageEl.src = img.image_url;
            imageEl.alt = `image-${img.image_id}`;
            imageEl.classList.add("post-image");

            slide.appendChild(imageEl);
            wrapper.appendChild(slide);
        });

    // Swiper 초기화
    new Swiper(".swiper", {
        slidesPerView: "auto",
        spaceBetween: 10,
        freeMode: true,
        grabCursor: true,
        pagination: {
            el: ".swiper-pagination",
            clickable: true,
        },
    });
}

// 마지막 카드가 보이면 다음 데이터 호출
const observer = new IntersectionObserver(
    (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && !isLoading) {
            observer.unobserve(lastEntry.target);
            fetchComments();
        }
    }
);

// 댓글 불러오기 함수
async function fetchComments() {
    if (isLoading) {
        return;
    }
    isLoading = true;

    try {
        let url = `http://localhost:8080/posts/${postId}/comments`;

        if (lastCommentCreatedAt && lastCommentId) {
            const formattedDate = lastCommentCreatedAt.replace(" ", "T");
            url += `?lastCommentCreatedAt=${formattedDate}&lastCommentId=${lastCommentId}`;
        }

        const response = await fetch(url, {
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
                    const response = await fetch(url, {
                        method: "GET",
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
        const comments = result.data.comments;

        if (!comments || comments.length === 0) {
            return;
        }

        renderComments(comments);

        lastCommentCreatedAt = result.data.last_comment_created_at;
        lastCommentId = result.data.last_comment_id;

        if (commentList.lastElementChild) {
            observer.observe(commentList.lastElementChild);
        } 
    } catch (err) {
        showToast("댓글 목록 조회 중 오류가 발생했습니다.");
    } finally {
        isLoading = false;
    }
}

// 댓글 렌더링 함수
function renderComments(comments) {

    comments.forEach(comment => {
        const card = document.createElement("div");
        card.classList.add("comment-card");

        const profileImg = comment.profile_image || "../assets/default-profile.png";
        const nickname = comment.nickname;
        const date = comment.created_at;
        const content = comment.content;

        card.innerHTML = `
            <div class="comment-header">
                <div class="comment-meta">
                    <img class="comment-author-profile" src="${profileImg}" alt="profile" />
                    <span class="comment-author">${nickname}</span>
                    <span class="comment-date">${date ? date.replace("T", " ") : ""}</span>
                </div>
                <div class="comment-actions">
                    <button class="edit-comment-btn" data-id="${comment.comment_id}">수정</button>
                    <button class="delete-comment-btn" data-id="${comment.comment_id}">삭제</button>
                </div>
            </div>
            <p class="comment-text">${content}</p>
    `;

        commentList.appendChild(card);
    });

    // 마지막 게시글 요소에 옵저버 붙이기
    const lastCard = commentList.lastElementChild;
    if (lastCard) {
        observer.observe(lastCard);
    }
}

// 숫자 포맷 함수
function formatNumber(num) {

    if (num >= 1000) {
        return `${Math.floor(num / 1000)}k`;
    }
  
    return num;
}

// 전체 초기화 함수
async function initPostPage() {

    if (!postId) {
        showToast("잘못된 접근입니다.");
        return;
    }

    try {
        const post = await fetchPostData(postId);
        renderPost(post);
    } catch (err) {
        showToast("게시글을 불러오는 중 오류가 발생했습니다.");
        window.location.href = "/posts";
  }
}

// 게시글 수정
editBtn.addEventListener("click", () => {

    if (!postId) {
        showToast("잘못된 접근입니다.");
        return;
    }

    window.location.href = `/edit/${postId}`;
});

// 게시글 삭제
deleteBtn.addEventListener("click", () => {
    postDeleteModal.classList.remove("hidden");
});

cancelPostDelete.addEventListener("click", () => {
    postDeleteModal.classList.add("hidden");
});

confirmPostDelete.addEventListener("click", async () => {

    try {
        const response = await fetch(`http://localhost:8080/posts/${postId}`, {
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
                    const response = await fetch(`http://localhost:8080/posts/${postId}`, {
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
        postDeleteModal.classList.add("hidden");
        postDeleteCompleteModal.classList.remove("hidden");
    } catch (err) {
        showToast("게시글 삭제 중 오류가 발생했습니다.");
    }
});

postDeleteCompleteBtn.addEventListener("click", () => {
    postDeleteCompleteModal.classList.add("hidden");
    window.location.href = "/posts";
});

// 댓글 입력 버튼
commentInput.addEventListener("input", () => {
    const trimmed = commentInput.value.trim();
    submitComment.disabled = trimmed.length === 0;
});

// 댓글 등록
submitComment.addEventListener("click", async () => {
    const content = commentInput.value;
    if (!content) {
        return;
    }
    try {
        const response = await fetch(`http://localhost:8080/posts/${postId}/comments`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({ content }),
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    accessToken = localStorage.getItem("accessToken");
                    const response = await fetch(`http://localhost:8080/posts/${postId}/comments`, {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${accessToken}`
                        },
                        body: JSON.stringify({ content }),
                        credentials: "include",
                    });
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

        // 댓글 등록 성공 후
        commentInput.value = "";
        submitComment.disabled = true;  

        commentList.innerHTML = "";
        lastCommentCreatedAt = null;
        lastCommentId = null;
        await fetchComments();
        await initPostPage();
    } catch (err) {
        showToast("댓글 등록 중 오류가 발생했습니다.");
    }
});

function updateLikeButtonUI(isLiked, count) {

    if (isLiked) {
        likeBtn.style.backgroundColor = "#d9d9d9";
        likeBtn.style.color = "white";
    } else {
        likeBtn.style.backgroundColor = "#e9e9e9";
        likeBtn.style.color = "#333";
    }

    likeBtn.innerHTML = `
        <strong>${count}</strong>
        <span>좋아요</span>
    `;
}

// 좋아요
likeBtn.addEventListener("click", async () => {
    try {
        const method = isLiked ? "DELETE" : "POST";

        const response = await fetch(`http://localhost:8080/posts/${postId}/likes`, {
            method: method,
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

                    const result = await response.json();
                    const response = await fetch(`http://localhost:8080/posts/${postId}/likes`, {
                        method: method,
                        headers: {
                            "Authorization": `Bearer ${accessToken}`
                        },
                        credentials: "include",
                    });

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

        const likeCountElement = likeBtn.querySelector("strong");
        const currentCount = parseInt(likeCountElement.textContent);
        const newCount = isLiked ? currentCount - 1 : currentCount + 1;
        isLiked = !isLiked;
        updateLikeButtonUI(isLiked, newCount);
    } catch (err) {
        showToast("좋아요 처리 중 오류가 발생했습니다.");
    }
});

// 댓글 삭제 버튼 클릭
commentList.addEventListener("click", (e) => {
    if (e.target.classList.contains("delete-comment-btn")) {
        commentId = e.target.dataset.id;
        commentElement = e.target.closest(".comment-card");
        commentDeleteModal.classList.remove("hidden");
  }
});

// 댓글 삭제 취소
cancelCommentDelete.addEventListener("click", () => {
    commentDeleteModal.classList.add("hidden");
    commentId = null;
    commentElement = null;
});

// 댓글 삭제 확인
confirmCommentDelete.addEventListener("click", async () => {
    try {
        const response = await fetch(`http://localhost:8080/posts/${postId}/comments/${commentId}`, {
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
                    const response = await fetch(`http://localhost:8080/posts/${postId}/comments/${commentId}`, {
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

        commentDeleteModal.classList.add("hidden");
        commentDeleteCompleteModal.classList.remove("hidden");

    } catch (err) {
        showToast("댓글 삭제 중 오류가 발생했습니다.");
    }
});

// 화면에서 댓글 삭제
commentDeleteCompleteBtn.addEventListener("click", async () => {
    commentDeleteCompleteModal.classList.add("hidden");

    commentInput.value = "";
    submitComment.disabled = true;  

    commentList.innerHTML = "";
    lastCommentCreatedAt = null;
    lastCommentId = null;
    await fetchComments();
    await initPostPage();
});

// 댓글 수정 버튼 클릭
commentList.addEventListener("click", (e) => {

    const btn = e.target.closest("button");
    if (!btn) {
        return;
    }

    if (e.target.classList.contains("edit-comment-btn")) {
        const commentCard = e.target.closest(".comment-card");
        const commentId = e.target.dataset.id;
        const commentTextElement = commentCard.querySelector(".comment-text");
        const commentActions = commentCard.querySelector(".comment-actions");

        // 중복 방지
        if (commentCard.classList.contains("editing")) {
            return;
        }
        commentCard.classList.add("editing");

        const originalText = commentTextElement.textContent;
        const textarea = document.createElement("textarea");
        textarea.value = originalText;
        textarea.classList.add("comment-edit-input");
        textarea.dataset.original = originalText;
        commentTextElement.replaceWith(textarea);

        commentActions.innerHTML = `
            <button class="save-comment-btn" data-id="${commentId}">완료</button>
            <button class="cancel-comment-btn" data-id="${commentId}">취소</button>
        `;

        const saveBtn = commentActions.querySelector(".save-comment-btn");
        saveBtn.disabled = textarea.value.trim().length === 0;
        textarea.addEventListener("input", () => {
            const trimmed = textarea.value.trim();
            saveBtn.disabled = trimmed.length === 0;
        });
    }

    // 수정 취소
    if (e.target.classList.contains("cancel-comment-btn")) {
        const commentCard = e.target.closest(".comment-card");
        const commentId = e.target.dataset.id;
        const textarea = commentCard.querySelector(".comment-edit-input");
        const commentActions = commentCard.querySelector(".comment-actions");

        const originalText = textarea.dataset.original;
        const commentTextElement = document.createElement("p");
        commentTextElement.classList.add("comment-text");
        commentTextElement.textContent = originalText;
        textarea.replaceWith(commentTextElement);

        commentActions.innerHTML = `
            <button class="edit-comment-btn" data-id="${commentId}">수정</button>
            <button class="delete-comment-btn" data-id="${commentId}">삭제</button>
            `;

        commentCard.classList.remove("editing");
    }

    // 수정 완료
    if (e.target.classList.contains("save-comment-btn")) {
        const commentCard = e.target.closest(".comment-card");
        const commentId = e.target.dataset.id;
        const textarea = commentCard.querySelector(".comment-edit-input");
        const newContent = textarea.value;

        if (!newContent) {
            showToast("댓글 내용을 입력해주세요.");
            return;
        }

        updateComment(commentId, newContent, commentCard);
    }
});

// 댓글 수정 API 요청
async function updateComment(commentId, newContent, commentCard) {

    try {
        const response = await fetch(`http://localhost:8080/posts/${postId}/comments/${commentId}`, {
            method: "PATCH",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${accessToken}`
            },
            body: JSON.stringify({ content: newContent }),
            credentials: "include",
        });

        const result = await response.json();
        if (!response.ok) {
            if (result.message === "인증이 필요합니다. 다시 로그인해주세요.") {
                const refreshSuccess = await tryRefreshToken();
                if (refreshSuccess) {
                    accessToken = localStorage.getItem("accessToken");
                    updateComment(commentId, newContent, commentCard);
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

        // 성공 시 화면 갱신
        const commentActions = commentCard.querySelector(".comment-actions");
        const textarea = commentCard.querySelector(".comment-edit-input");

        const newP = document.createElement("p");
        newP.classList.add("comment-text");
        newP.textContent = newContent;

        textarea.replaceWith(newP);
        commentActions.innerHTML = `
            <button class="edit-comment-btn" data-id="${commentId}">수정</button>
            <button class="delete-comment-btn" data-id="${commentId}">삭제</button>
        `;
        commentCard.classList.remove("editing");

    } catch (err) {
        showToast("댓글 수정 중 오류가 발생했습니다.");
    }
}

// 실행
document.addEventListener("DOMContentLoaded", async () => {
    try {
        await loadUserProfile();
        await initPostPage();
        await fetchComments();
    } catch (err) {
        showToast("페이지를 불러오는 중 오류가 발생했습니다.");
        window.location.href = "/posts";
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
    else if (result.status === 409) {
        showToast(result.message);
    }
    else if (result.status === 422) {
        result.errors.forEach(err => {
            if (err.field === "content") {
                showToast(err.message);
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