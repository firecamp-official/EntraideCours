import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

import { supabase } from "../../js/supabase.js";


// 🔹 Cloudinary
const cloudName = "dwfws7ydj";      // ton Cloudinary Cloud Name
const uploadPreset = "stockageImage"; // ton preset unsigned

// 🔹 DOM
const preview = document.getElementById("preview");
const imageUrl = document.getElementById("imageUrl");
const result = document.getElementById("result");
const copyBtn = document.getElementById("copyUrl");
const imageContainer = document.getElementById("imageContainer");

// 🔹 Charger les images depuis Supabase
async function loadImages() {
  const { data, error } = await supabase
    .from("images")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) {
    console.error(error);
    return;
  }

  imageContainer.innerHTML = "";
  data.forEach(img => {
    const div = document.createElement("div");

    const imgEl = document.createElement("img");
    imgEl.src = img.url;

    const input = document.createElement("input");
    input.value = img.url;
    input.readOnly = true;

    div.appendChild(imgEl);
    div.appendChild(input);
    imageContainer.appendChild(div);
  });
}

// 🔹 Widget Cloudinary
const widget = cloudinary.createUploadWidget(
  {
    cloudName: cloudName,
    uploadPreset: uploadPreset,
    multiple: false,
    folder: "courses"
  },
  async (error, resultInfo) => {
    if (!error && resultInfo && resultInfo.event === "success") {
      const url = resultInfo.info.secure_url;
      console.log("Upload réussi :", url);

      // Preview
      preview.src = url;
      imageUrl.value = url;
      result.hidden = false;

      // Récupérer l'utilisateur connecté (Supabase JS v2)
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error(userError);
        return;
      }

      // Insérer dans Supabase
      const { error: insertError } = await supabase
        .from("images")
        .insert([{ url, uploaded_by: user.id }]);

      if (insertError) console.error(insertError);

      // Recharger la liste
      loadImages();
    }
  }
);

// 🔹 Événements
document.getElementById("openExplorer").addEventListener("click", () => {
  widget.open();
});

copyBtn.addEventListener("click", () => {
  navigator.clipboard.writeText(imageUrl.value);
  alert("URL copiée !");
});

// 🔹 Charger au démarrage
loadImages();
