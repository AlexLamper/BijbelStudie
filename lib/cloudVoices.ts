export interface CloudVoice {
  id: string;
  googleId: string;
  name: string;
  gender: "F" | "M";
  description: string;
}

export const CLOUD_VOICES: CloudVoice[] = [
  { id: "diana", googleId: "nl-NL-Wavenet-D", name: "Vrouw", gender: "F", description: "Nederlandse vrouwenstem" },
  { id: "bram",  googleId: "nl-NL-Wavenet-B", name: "Man",   gender: "M", description: "Nederlandse mannenstem" },
];

export function getCloudVoice(id: string): CloudVoice | undefined {
  return CLOUD_VOICES.find(v => v.id === id);
}
