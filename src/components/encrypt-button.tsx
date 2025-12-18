"use client";

import { Button } from "@heroui/react";

const TARGET_TEXT = "Download Resume";

export const EncryptButton = () => {
  const handleClick = () => {
    window.open(process.env.NEXT_PUBLIC_RESUME_URL, "_blank");
  };

  return (
    <Button
      aria-label={TARGET_TEXT}
      className="px-6 py-2 font-medium text-white w-fit md:mt-10 transition-all shadow-[3px_3px_0px_white] hover:shadow-none hover:translate-x-[3px] hover:translate-y-[3px] rounded-none"
      color="primary"
      name={TARGET_TEXT}
      onPress={handleClick}
    >
      {TARGET_TEXT}
    </Button>
  );
};
