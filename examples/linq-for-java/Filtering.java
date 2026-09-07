import io.github.piscescup.linq4j.Linq;
import java.util.Arrays;

public class Filtering {
    public static void main(String[] args) {
        var evens = Linq.ofInts(1, 2, 3, 4, 5)
            .where(value -> value % 2 == 0)
            .toArray();

        System.out.println(Arrays.toString(evens));
    }
}
