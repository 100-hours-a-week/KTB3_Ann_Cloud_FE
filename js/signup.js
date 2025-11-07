/* ======================== 공통 요소 ======================== */
const email = document.getElementById("email");
const password = document.getElementById("password");
const passwordConfirm = document.getElementById("passwordConfirm");
const nickname = document.getElementById("nickname");
const signupBtn = document.getElementById("signupBtn");

const emailHelper = document.getElementById("emailHelper");
const passwordHelper = document.getElementById("passwordHelper");
const passwordConfirmHelper = document.getElementById("passwordConfirmHelper");
const nicknameHelper = document.getElementById("nicknameHelper");

const modal = document.getElementById("signupModal");
const confirmModal = document.getElementById("confirmModal");
const errorToast = document.getElementById("errorToast");

const backBtn = document.querySelector(".back-btn");
backBtn.addEventListener("click", () => {
    window.location.href = "/login";
});

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
    else if (result.status === 409) {
        showToast(result.message);
    }
    else if (result.status === 422) {
        if (result.message) {
            showToast(result.message);
        }
        if (result.errors) {
            result.errors.forEach(err => {
            if (err.field === "email") {
                emailHelper.textContent = err.message;
            } 
            else if (err.field === "password") {
                passwordHelper.textContent = err.message;
            } 
            else if (err.field === "password_confirm") {
                passwordConfirmHelper.textContent = err.message;
            } 
            else if (err.field === "nickname") {
                nicknameHelper.textContent = err.message;
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

/* ======================== 입력 검증 ======================== */
// 이메일 검증
function validateEmail(input) {

    if (!input.trim()) {
        return "이메일을 입력해주세요.";
    }

    const regex = /^(?!.*\.\.)(?!\.)(?!.*\.$)[A-Za-z0-9._%+-]+@([A-Za-z0-9]+(-[A-Za-z0-9]+)*\.)+[A-Za-z]{2,}$/;
    if (!regex.test(input)) {
        return "올바른 이메일 주소 형식을 입력해주세요. (예: example@example.com)";
    }

    return "";
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

/* ======================== 입력 이벤트 ======================== */
function checkFormValidity() {
    const emailMsg = validateEmail(email.value);
    const passwordMsg = validatePassword(password.value);
    const passwordConfirmMsg = validatePasswordConfirm(passwordConfirm.value);
    const nicknameMsg = validateNickname(nickname.value);

    const allValid = !emailMsg && !passwordMsg && !passwordConfirmMsg && !nicknameMsg;
    signupBtn.disabled = !allValid;
    signupBtn.classList.toggle("active", allValid);
}

email.addEventListener("input", () => {
    const msg = validateEmail(email.value);
    emailHelper.textContent = msg;
    checkFormValidity();
});

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

nickname.addEventListener("input", () => {
    const msg = validateNickname(nickname.value);
    nicknameHelper.textContent = msg;
    checkFormValidity();
});

/* ======================== 프로필 이미지 ======================== */
const profileImg = document.getElementById("profileImg");
const profilePreview = document.getElementById("profilePreview");
const plusIcon = document.getElementById("plusIcon");
const profileInput = document.getElementById("profileInput");

profileImg.addEventListener("click", () => profileInput.click());

let hasImage = false;
let selectedFile = null;

profileInput.addEventListener("change", (e) => {
    const image = e.target.files[0];

    if (!image) {
        if (hasImage) {
            profilePreview.src = "../assets/default-profile.png";
            plusIcon.style.display = "block";
            hasImage = false;
            selectedFile = null;
        }
        return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
        profilePreview.src = event.target.result;
        plusIcon.style.display = "none";
        hasImage = true;
        selectedFile = image;
    };
    reader.readAsDataURL(image);
});

/* ======================== S3 업로드 ======================== */
async function uploadImageToS3(file) {
    const formData = new FormData();
    formData.append("file", file);

    try {
        const response = await fetch(`${ENV.API_BASE_URL}/images/presigned-url`, {
            method: "POST",
            body: formData,
        });

        const result = await response.json();
        if (!response.ok) {
            handleApiError(result);
        }

        const imageUrl = result.data.image;

        return imageUrl;

    } catch (error) {
        showToast("이미지 업로드 중 오류가 발생했습니다.")
        return null;
    }
}

/* ======================== 회원가입 ======================== */
document.getElementById("signupForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    try {
        let profileImageUrl = null;

        if (selectedFile) {
            profileImageUrl = await uploadImageToS3(selectedFile);
        }

        const response = await fetch(`${ENV.API_BASE_URL}/users`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                email: email.value,
                password: password.value,
                password_confirm: passwordConfirm.value,
                nickname: nickname.value,
                profile_image: profileImageUrl,
            }),
            credentials: "include",
        });

        const result = await response.json();
        
        if (response.ok) {
            modal.classList.remove("hidden");

            confirmModal.onclick = () => {
                modal.classList.add("hidden");
                window.location.href = "/login";
            };
        }
        else {
            handleApiError(result);
        }

    } catch (error) {
        showToast("회원가입 중 오류가 발생했습니다.");

    }
});