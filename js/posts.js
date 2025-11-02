const userProfileImg = document.querySelector(".user-profile");
const profileDropdown = document.querySelector(".profile-dropdown");
const logoutModal = document.getElementById("logoutModal");
const cancelLogout = document.getElementById("cancelLogout");
const confirmLogout = document.getElementById("confirmLogout");
const logoutCompleteModal = document.getElementById("logoutCompleteModal");
const confirmLogoutComplete = document.getElementById("confirmLogoutComplete");
const profileDropdownButtons = profileDropdown.querySelectorAll("button");
const postList = document.getElementById("postList");
const writeBtn = document.getElementById("writeBtn");

const errorToast = document.getElementById("errorToast");

let lastPostCreatedAt = null;
let lastPostId = null;
let isLoading = false;
let accessToken = localStorage.getItem("accessToken");

function showToast(message) {
    errorToast.textContent = message;
    errorToast.classList.remove("hidden");
    errorToast.classList.add("show");

    setTimeout(() => {
        errorToast.classList.remove("show");
        setTimeout(() => errorToast.classList.add("hidden"), 300);
    }, 2500);
}

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

                        localStorage.removeItem("accessToken");

                        logoutModal.classList.add("hidden");
                        logoutCompleteModal.classList.remove("hidden");

                        confirmLogoutComplete.onclick = () => {
                            logoutCompleteModal.classList.add("hidden");
                            window.location.href = "/login";
                        };
                    } catch (err) {
                        showToast("로그아웃 중 오류가 발생했습니다.")
                    }
                };
                break;
        }
    });
});

writeBtn.addEventListener("click", () => {
    window.location.href = "/write"; 
});

// 마지막 카드가 보이면 다음 데이터 호출
const observer = new IntersectionObserver(
    (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && !isLoading) {
            observer.unobserve(lastEntry.target);
            fetchPosts();
        }
    }
);

// 게시글 불러오기 함수
async function fetchPosts() {
    if (isLoading) {
        return;
    }
    isLoading = true;

    try {
        let url = "http://localhost:8080/posts"

        if (lastPostCreatedAt && lastPostId) {
            const formattedDate = lastPostCreatedAt.replace(" ", "T");
            url += `?lastPostCreatedAt=${formattedDate}&lastPostId=${lastPostId}`;
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
        const posts = result.data.posts;

        if (!posts || posts.length === 0) {
            return;
        }

        renderPosts(posts);

        lastPostCreatedAt = result.data.last_post_created_at;
        lastPostId = result.data.last_post_id;

        if (postList.lastElementChild) {
            observer.observe(postList.lastElementChild);
        } 
    } catch (err) {
        showToast("게시글 목록 조회 중 오류가 발생했습니다.");
    } finally {
        isLoading = false;
    }
}

// 게시글 렌더링 함수
function renderPosts(posts) {

    posts.forEach(post => {
        const card = document.createElement("div");
        card.classList.add("post-card");

        card.innerHTML = `
            <div class="post-head">
                <h3 class="post-title">${post.title}</h3>
            </div>
            <div class="post-meta">
                <div class="post-meta-left">
                    <span>좋아요 ${formatNumber(post.like_count)}</span>
                    <span>댓글 ${formatNumber(post.comment_count)}</span>
                    <span>조회수 ${formatNumber(post.view_count)}</span>
                </div>
                <span class="post-date">${post.created_at.replace("T", " ")}</span>
            </div>
            <div class="author">
                <img class="profile" src="${post.profile_image || "../assets/default-profile.png"}" alt="profile" />
                <span>${post.nickname}</span>
            </div>
        `;

        // 게시글 클릭 시 상세 페이지로 이동
        card.addEventListener("click", () => {
            window.location.href = `/post/${post.post_id}`;
        });

        postList.appendChild(card);
    });

    // 마지막 게시글 요소에 옵저버 붙이기
    const lastCard = postList.lastElementChild;
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
            return;
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
    else if (result.status === 404) {
        showToast(result.message);
    }
    else if (result.status === 500) {
        showToast(result.message);
    }
    else {
        showToast("알 수 없는 오류가 발생했습니다.");
    }
}

// 게시글 로드
loadUserProfile().then(fetchPosts);