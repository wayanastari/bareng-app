import { StyleSheet, Text, TextInput, View } from "react-native";

const FormInput = ({ label, ...props }) => {
  return (
    <View style={styles.inputGroup}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        style={styles.input}
        placeholderTextColor="#9CA3AF"
        {...props}
      />
    </View>
  );
};

export default FormInput;

const styles = StyleSheet.create({
  label: {
    color: "#9ca3af", // Warna sesuai subHeaderText atau dayNameText
    fontSize: 16, // Ukuran font disesuaikan
    marginBottom: 8, // Menambah sedikit ruang
    fontWeight: "500",
  },
  input: {
    width: "100%", // Memastikan lebar penuh
    backgroundColor: "#4b5563", // Warna background input dari modal input
    color: "#ffffff",
    padding: 12, // Padding dari modal input
    borderRadius: 8, // Border radius dari modal input
    marginBottom: 15, // Margin bawah dari modal input
    fontSize: 16, // Ukuran font dari modal input
  },
  passwordLabelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8, // Menambah margin bawah
  },
});
