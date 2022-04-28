
package main;

public class App {

    /**
     * @param args
     * @throws Exception
     */
    public static void main(String[] args) throws Exception {

        // String json = "{\"loadConfig\":\"true\", "\"saveConfig\":\"false\","\"configFile\":\"C:\\Users\\Vale\\Downloads\\Campy-Data-multipleStrains\\Campy-Data-multipleStrains\\Campy.config\"}";

        if(args.length == 1) {
            Main main = new Main(args[0]);
            main.compute();
        } else {
            System.err.println("Wrong input: [JSON String]");
        }
    }
}