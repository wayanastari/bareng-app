import { LinearGradient } from "expo-linear-gradient";
import {
  Dimensions,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const { height, width } = Dimensions.get("window");
const logoBareng = require("../../assets/images/Logo-Bareng.png");

const AuthLayout = ({ title, children }) => {
  return (
    <LinearGradient colors={["#1f2937", "#111827"]} style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
        keyboardVerticalOffset={80} // sesuaikan jika perlu
      >
        {/* <TouchableWithoutFeedback onPress={Keyboard.dismiss}> */}
        <ScrollView
          contentContainerStyle={[styles.scroll, { flexGrow: 0 }]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.logoContainer}>
            <Image
              source={logoBareng}
              style={styles.logo}
              resizeMode="contain"
            />
            <Text style={styles.title}>{title}</Text>
          </View>

          <View style={styles.form}>{children}</View>
        </ScrollView>
        {/* </TouchableWithoutFeedback> */}
      </KeyboardAvoidingView>
    </LinearGradient>
  );
};

export default AuthLayout;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#1f2937",
    width,
    height,
  },
  scroll: {
    paddingHorizontal: 24,
    paddingVertical: 48,
    // jangan gunakan justifyContent center agar konten bisa bergeser pas keyboard muncul
  },
  logoContainer: {
    alignItems: "center",
  },
  logo: {
    height: 100,
    width: 150,
    resizeMode: "contain",
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#ffffff",
    textAlign: "center",
    letterSpacing: 1,
  },
  form: {
    marginTop: 30,
    padding: 25,
    backgroundColor: "#374151",
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
});
