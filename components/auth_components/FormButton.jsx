import { StyleSheet, Text, TouchableOpacity } from "react-native";

const FormButton = ({ title, onPress }) => (
  <TouchableOpacity style={styles.button} onPress={onPress}>
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

export default FormButton;

const styles = StyleSheet.create({
  button: {
    backgroundColor: "#ec4899", // Warna aksen pink dari fab
    borderRadius: 8, // Border radius dari modalButton
    paddingVertical: 12, // Padding dari modalButton
    alignItems: "center",
    marginTop: 24,
    shadowColor: "#000", // Shadow dari modalButton
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  buttonText: {
    color: "#ffffff",
    fontWeight: "bold",
    fontSize: 16, // Ukuran font dari modalButtonText
  },
  footer: {
    marginTop: 30, // Menyesuaikan margin top
    textAlign: "center",
    color: "#d1d5db", // Warna teks dari eventDescription
    fontSize: 14,
  },
  signUp: {
    color: "#6b21a8", // Warna aksen ungu dari selectedCalendarDay
    fontWeight: "bold", // Konsisten dengan gaya teks Anda
  },
});
