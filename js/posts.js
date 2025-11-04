// ====================== 공통 상수 및 요소 ======================
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

// ====================== 공통 함수 ======================
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

function formatNumber(num) {

    if (num >= 1000) {
        return `${Math.floor(num / 1000)}k`;
    }
  
    return num;
}

// ====================== 토큰 재발급 ======================
async function tryRefreshToken() {
    try {
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
            const refreshed = await tryRefreshToken();
            if (!refreshed) {
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

// ====================== 게시글 관련 ======================
async function fetchPosts() {
    if (isLoading) {
        return;
    }
    isLoading = true;

    try {
        const result = await fetchPostData();

        if (!result) {
            return;
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

async function fetchPostData() {
    let url = "http://localhost:8080/posts";

    if (lastPostCreatedAt && lastPostId) {
        const formattedDate = lastPostCreatedAt.replace(" ", "T");
        url += `?lastPostCreatedAt=${formattedDate}&lastPostId=${lastPostId}`;
    }

    try {
        let response = await fetch(url, {
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
            response = await fetch(url, {
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
    } catch (err) {
        showToast("게시글 데이터를 불러오는 중 오류가 발생했습니다.");
        return null;
    }
}

// ====================== 게시글 렌더링 ======================
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

        card.addEventListener("click", () => {
            window.location.href = `/post/${post.post_id}`;
        });

        postList.appendChild(card);
    });

    const lastCard = postList.lastElementChild;
    if (lastCard) {
        observer.observe(lastCard);
    }
}

// ====================== 이벤트 ======================

userProfileImg.addEventListener("click", () => {
    profileDropdown.classList.toggle("hidden");
});

document.addEventListener("click", (e) => {
    if (!profileDropdown.contains(e.target) && e.target !== userProfileImg) {
        profileDropdown.classList.add("hidden");
    }
});

writeBtn.addEventListener("click", () => {
    window.location.href = "/write"; 
});

const observer = new IntersectionObserver(
    (entries) => {
        const lastEntry = entries[0];
        if (lastEntry.isIntersecting && !isLoading) {
            observer.unobserve(lastEntry.target);
            fetchPosts();
        }
    }
);

loadUserProfile().then(fetchPosts);