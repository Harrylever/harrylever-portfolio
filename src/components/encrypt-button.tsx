"use client";

const TARGET_TEXT = "Download Resume";

export const EncryptButton = () => {
  const handleClick = () => {
    window.open(process.env.NEXT_PUBLIC_RESUME_URL, "_blank");
  };

  return (
    <button
      aria-label={TARGET_TEXT}
      className="px-6 py-2 font-medium text-white w-fit md:mt-10 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] rounded-none"
      name={TARGET_TEXT}
      onClick={handleClick}
    >
      {TARGET_TEXT}
    </button>
  );
};
